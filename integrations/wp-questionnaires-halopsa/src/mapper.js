function compact(value) {
  return value === undefined || value === null || value === '' ? undefined : value;
}

function asJson(value) {
  if (value === undefined || value === null) return '';
  return JSON.stringify(value, null, 2);
}

function splitName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstname: '', surname: '' };
  if (parts.length === 1) return { firstname: parts[0], surname: '' };
  return { firstname: parts.slice(0, -1).join(' '), surname: parts.at(-1) };
}

function customFields(fieldMap, values) {
  return Object.entries(values)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => ({
      name: fieldMap[key] || key,
      value
    }));
}

function getRecommendations(submission) {
  return submission.findings || submission.recommendations || submission.top_actions || [];
}

export function mapSubmissionToHalo(submission, config, campaign) {
  const fieldMap = config.fieldMap;
  const questionnaireName = submission.questionnaire_name || submission.questionnaire_ref || 'WP Questionnaire';
  const campaignName = campaign?.name || questionnaireName;
  const recommendations = getRecommendations(submission);
  const { firstname, surname } = splitName(submission.contact_name);

  const sourceValues = {
    source: 'WP Questionnaires',
    submission_id: submission.id,
    submission_ref: submission.submission_ref,
    questionnaire_ref: submission.questionnaire_ref,
    questionnaire_name: campaignName,
    overall_score: submission.overall_score,
    grade_label: submission.grade_label,
    domain_scores_json: asJson(submission.domain_scores),
    answers_json: asJson(submission.answers_json),
    recommendations_json: asJson(recommendations),
    utm_source: submission.utm_source,
    utm_medium: submission.utm_medium,
    utm_campaign: submission.utm_campaign,
    landing_page: submission.landing_page,
    referrer_url: submission.referrer_url,
    completed_at: submission.completed_at
  };

  const clientPayload = {
    name: submission.contact_company,
    customfields: customFields(fieldMap.client || {}, {
      source: 'WP Questionnaires',
      campaign: campaignName
    })
  };

  const contactPayload = {
    name: submission.contact_name,
    firstname,
    surname,
    emailaddress: submission.contact_email,
    email: submission.contact_email,
    phonenumber: compact(submission.contact_phone),
    customfields: customFields(fieldMap.contact || {}, {
      source: 'WP Questionnaires',
      campaign: campaignName,
      submission_ref: submission.submission_ref
    })
  };

  const summary = `${questionnaireName} assessment - ${submission.contact_company}`;
  const details = buildProspectDetails(submission, recommendations, campaignName);

  const prospectPayload = {
    summary,
    title: summary,
    details,
    client_name: submission.contact_company,
    user_name: submission.contact_name,
    status_id: compact(config.halo.defaults.prospectInterestedStatusId || config.halo.defaults.prospectStatusId),
    tickettype_id: compact(config.halo.defaults.prospectTypeId),
    priority_id: compact(config.halo.defaults.defaultPriorityId),
    customfields: customFields(fieldMap.prospect || {}, sourceValues)
  };

  if (campaign?.id) {
    prospectPayload.campaign_id = campaign.id;
    prospectPayload.list_id = campaign.id;
  }

  return {
    clientPayload,
    contactPayload,
    prospectPayload,
    externalRef: submission.submission_ref || `WPQ-${submission.id}`,
    campaignName
  };
}

function buildProspectDetails(submission, recommendations, campaignName) {
  const lines = [];
  lines.push(`Source: WP Questionnaires`);
  lines.push(`Campaign: ${campaignName}`);
  lines.push(`Questionnaire: ${submission.questionnaire_name || submission.questionnaire_ref || ''}`);
  lines.push(`Submission: ${submission.submission_ref || submission.id}`);
  lines.push(`Contact: ${submission.contact_name} <${submission.contact_email}>`);
  lines.push(`Company: ${submission.contact_company}`);
  if (submission.contact_phone) lines.push(`Phone: ${submission.contact_phone}`);
  lines.push(`Score: ${submission.overall_score ?? ''}`);
  lines.push(`Grade: ${submission.grade_label || ''}`);
  if (submission.completed_at) lines.push(`Completed: ${submission.completed_at}`);
  if (submission.landing_page) lines.push(`Landing page: ${submission.landing_page}`);
  if (submission.referrer_url) lines.push(`Referrer: ${submission.referrer_url}`);

  lines.push('');
  lines.push('Domain scores:');
  lines.push(asJson(submission.domain_scores || {}));

  lines.push('');
  lines.push('Recommendations / findings:');
  if (Array.isArray(recommendations) && recommendations.length > 0) {
    for (const item of recommendations) {
      const priority = item.priority ? `[${item.priority}] ` : '';
      const domain = item.domain || item.domain_name ? `${item.domain || item.domain_name}: ` : '';
      lines.push(`- ${priority}${domain}${item.action || item.question || JSON.stringify(item)}`);
    }
  } else {
    lines.push('- No recommendation payload was present in the WPQ API response. Extend WPQ HaloPSA API to expose findings_json for full recommendation sync.');
  }

  lines.push('');
  lines.push('Answers JSON:');
  lines.push(asJson(submission.answers_json || {}));

  return lines.join('\n');
}
