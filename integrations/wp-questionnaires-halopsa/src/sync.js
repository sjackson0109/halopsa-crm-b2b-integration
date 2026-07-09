import { mapSubmissionToHalo } from './mapper.js';

export class WpqHaloSync {
  constructor({ wpqClient, haloClient, config, logger = console }) {
    this.wpq = wpqClient;
    this.halo = haloClient;
    this.config = config;
    this.logger = logger;
  }

  async runOnce() {
    const pending = await this.wpq.listPending({
      page: 1,
      perPage: this.config.runtime.pageSize
    });

    const submissions = pending?.submissions || [];
    this.logger.info(`Found ${submissions.length} pending WPQ submission(s).`);

    const results = [];
    for (const submission of submissions) {
      results.push(await this.processSubmission(submission));
    }

    return {
      found: submissions.length,
      processed: results.filter(result => result.status === 'synced').length,
      failed: results.filter(result => result.status === 'failed').length,
      results
    };
  }

  async processSubmission(summary) {
    const id = summary.id;
    try {
      if (!this.config.runtime.dryRun) {
        await this.wpq.start(id);
      }

      const detailResponse = await this.wpq.getSubmission(id);
      const submission = detailResponse.submission || summary;
      const campaign = await this.halo.resolveCampaign(submission.questionnaire_name || submission.questionnaire_ref || 'WP Questionnaire');
      const mapped = mapSubmissionToHalo(submission, this.config, campaign);

      this.logger.info(`Processing ${mapped.externalRef}: ${submission.contact_company} / ${submission.contact_email}`);

      if (this.config.runtime.dryRun) {
        this.logger.info(JSON.stringify({ dryRun: true, mapped }, null, 2));
        return { id, status: 'dry_run', externalRef: mapped.externalRef };
      }

      const client = await this.halo.upsertClient(mapped.clientPayload);
      const clientId = client?.id || client?.client_id;

      const contactPayload = {
        ...mapped.contactPayload,
        client_id: clientId || undefined
      };
      const contact = await this.halo.upsertContact(contactPayload);
      const contactId = contact?.id || contact?.user_id;

      const prospectPayload = {
        ...mapped.prospectPayload,
        client_id: clientId || undefined,
        user_id: contactId || undefined
      };
      const prospect = await this.halo.upsertProspect(prospectPayload, mapped.externalRef);
      const prospectId = prospect?.id || prospect?.opportunity_id || prospect?.ticket_id;

      if (!prospectId) {
        throw new Error('HaloPSA prospect create/update did not return a usable ID.');
      }

      await this.wpq.acknowledge(id, prospectId);
      this.logger.info(`Synced WPQ submission ${id} to HaloPSA prospect ${prospectId}.`);
      return { id, status: 'synced', halopsa_id: prospectId };
    } catch (error) {
      const message = error?.bodyText || error?.message || String(error);
      this.logger.error(`Failed to sync WPQ submission ${id}: ${message}`);

      if (!this.config.runtime.dryRun) {
        const retry = (summary.halopsa_retry_count || 0) < this.config.runtime.maxRetries;
        try {
          await this.wpq.fail(id, message, retry);
        } catch (reportError) {
          this.logger.error(`Could not report failure to WPQ for submission ${id}: ${reportError.message}`);
        }
      }

      return { id, status: 'failed', error: message };
    }
  }
}
