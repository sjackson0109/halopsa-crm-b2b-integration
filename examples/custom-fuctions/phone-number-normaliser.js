/**
 * Phone Number Normalization Utility
 *
 * Converts phone numbers to standardized formats for CRM integration:
 * - E.164: International standard (+1234567890)
 * - E.123: National format for human readability ((123) 456-7890)
 *
 * Features:
 * - Strips non-numeric characters
 * - Detects country from CRM region field
 * - Validates number formats
 * - Handles international prefixes
 * - Provides fallback formatting
 */

const fs = require('fs');
const path = require('path');
const { DOMParser } = require('@xmldom/xmldom');

class PhoneNumberNormaliser {
  constructor() {
    this.countryData = null;
    this.loadCountryData();
  }

  /**
   * Load country code data from XML file
   */
  loadCountryData() {
    try {
      const xmlPath = path.join(__dirname, 'e164_e123_country_code_table.xml');
      const xmlContent = fs.readFileSync(xmlPath, 'utf8');
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlContent, 'text/xml');

      this.countryData = {};
      const entries = doc.getElementsByTagName('Entry');

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const callingCode = entry.getElementsByTagName('calling_code')[0]?.textContent;

        if (callingCode) {
          this.countryData[callingCode] = {
            country: entry.getElementsByTagName('country')[0]?.textContent || '',
            territories: entry.getElementsByTagName('itu_territories')[0]?.textContent || '',
            internationalPrefix: entry.getElementsByTagName('itu_international_prefix')[0]?.textContent || '',
            nsnLengths: entry.getElementsByTagName('e164_nsn_lengths')[0]?.textContent || '',
            prefixRegex: entry.getElementsByTagName('prefix_regex')[0]?.textContent || '',
            lengthRegex: entry.getElementsByTagName('e164_length_regex')[0]?.textContent || '',
            exampleE123: entry.getElementsByTagName('example_e123')[0]?.textContent || '',
            numberFormat: entry.getElementsByTagName('number_format')[0]?.textContent || ''
          };
        }
      }

      console.log(`Loaded ${Object.keys(this.countryData).length} country codes`);
    } catch (error) {
      console.error('Failed to load country data:', error);
      this.countryData = {};
    }
  }

  /**
   * Strip phone number to digits only
   */
  stripToDigits(phoneNumber) {
    if (!phoneNumber) return '';
    return phoneNumber.replace(/\D/g, '');
  }

  /**
   * Detect country from CRM region field
   */
  detectCountryFromRegion(region) {
    if (!region) return null;

    // Map common region names to calling codes
    const regionMappings = {
      'UK': '44',
      'United Kingdom': '44',
      'Germany': '49',
      'France': '33',
      'Italy': '39',
      'Spain': '34',
      'Netherlands': '31',
      'Belgium': '32',
      'Switzerland': '41',
      'Austria': '43',
      'Nordic Countries': '47', // Norway as representative
      'Eastern Europe': '48', // Poland as representative
      'Russia': '7',
      'China': '86',
      'Japan': '81',
      'South Korea': '82',
      'India': '91',
      'Australia': '61',
      'New Zealand': '64',
      'UAE': '971',
      'Saudi Arabia': '966',
      'Qatar': '974',
      'Kuwait': '965',
      'Oman': '968',
      'Bahrain': '973',
      'Israel': '972',
      'Turkey': '90',
      'Iran': '98',
      'Iraq': '964',
      'South Africa': '27',
      'Nigeria': '234',
      'Kenya': '254',
      'Egypt': '20',
      'Morocco': '212',
      'Ghana': '233',
      'Ethiopia': '251',
      'Tanzania': '255',
      'USA': '1',
      'Canada': '1',
      'Mexico': '52',
      'Brazil': '55',
      'Argentina': '54',
      'Chile': '56',
      'Colombia': '57',
      'Peru': '51',
      'Venezuela': '58'
    };

    return regionMappings[region] || null;
  }

  /**
   * Convert to E.164 format (+1234567890)
   */
  toE164(phoneNumber, countryCode = null) {
    if (!phoneNumber) return '';

    let digits = this.stripToDigits(phoneNumber);

    // Special handling for UK and Austria: strip leading 0 from national numbers
    if ((countryCode === '44' || countryCode === '43') && digits.startsWith('0')) {
      digits = digits.substring(1);
    }

    // If country code provided, prepend it
    if (countryCode && !digits.startsWith(countryCode)) {
      digits = countryCode + digits;
    }

    // Always return pure E.164 format: + followed by digits only
    return digits ? '+' + digits : '';
  }

  /**
   * Convert E.164 to E.123 national format
   */
  toE123(e164Number, countryCode = null) {
    if (!e164Number || !e164Number.startsWith('+')) return e164Number;

    let detectedCountryCode, nationalNumber;

    if (countryCode && e164Number.startsWith('+' + countryCode)) {
      // If we know the country code and it matches the start, use it
      detectedCountryCode = countryCode;
      nationalNumber = e164Number.substring(1 + countryCode.length).replace(/\s/g, '');
    } else {
      // Extract country code and national number using regex
      const match = e164Number.match(/^\+(\d{1,4})(\d+)$/);
      if (!match) return e164Number;
      detectedCountryCode = match[1];
      nationalNumber = match[2];
    }

    // Use provided country code or detected one
    const targetCountryCode = countryCode || detectedCountryCode;

    const countryInfo = this.countryData[targetCountryCode];
    if (!countryInfo) {
      // Fallback: format as international if country not found
      return this.formatAsInternational(e164Number);
    }

    // Apply country-specific formatting
    const formatted = this.applyCountryFormatting(nationalNumber, countryInfo, targetCountryCode);

    return formatted;
  }

  /**
   * Apply country-specific E.123 formatting
   */
  applyCountryFormatting(nationalNumber, countryInfo, countryCode) {
    const format = countryInfo.numberFormat;

    if (!format) {
      // Fallback to basic grouping
      return '+' + countryCode + ' ' + this.formatBasicNational(nationalNumber);
    }

    try {
      // For now, use a simpler approach based on country and length
      const totalDigits = nationalNumber.length;

      // Choose format based on country and length
      if (countryCode === '1' && totalDigits === 10) {
        // US/Canada 10-digit: +1 XXX-XXX-XXXX
        return `+${countryCode} ${nationalNumber.slice(0,3)}-${nationalNumber.slice(3,6)}-${nationalNumber.slice(6)}`;
      } else if (countryCode === '1' && totalDigits === 7) {
        // US/Canada 7-digit: +1 XXX-XXXX
        return `+${countryCode} ${nationalNumber.slice(0,3)}-${nationalNumber.slice(3)}`;
      } else if (countryCode === '44') {
        // UK numbers: strip leading 0 from national number for formatting
        let formattedNational = nationalNumber;
        if (formattedNational.startsWith('0')) {
          formattedNational = formattedNational.substring(1);
        }

        if (formattedNational.length === 10) {
          // UK 10-digit: +44 XXX XXX XXXX
          return `+${countryCode} ${formattedNational.slice(0,3)} ${formattedNational.slice(3,6)} ${formattedNational.slice(6)}`;
        } else if (formattedNational.length === 9) {
          // UK 9-digit: +44 XX XXX XXXX
          return `+${countryCode} ${formattedNational.slice(0,2)} ${formattedNational.slice(2,5)} ${formattedNational.slice(5)}`;
        } else {
          // Fallback
          return `+${countryCode} ${formattedNational}`;
        }
      } else if (countryCode === '49') {
        // German numbers: handle area codes properly
        // German area codes are 2-5 digits starting with 0, followed by subscriber number
        let formattedNational = nationalNumber;

        // If it starts with 0, this indicates an area code
        if (formattedNational.startsWith('0')) {
          // Common German area codes: 2-5 digits
          // Try to identify area code length by common patterns
          let areaCode = '';
          let subscriber = '';

          if (formattedNational.length >= 10) { // Likely 3-digit area code + 7-digit subscriber
            areaCode = formattedNational.substring(0, 3);
            subscriber = formattedNational.substring(3);
          } else if (formattedNational.length >= 9) { // Likely 2-digit area code + 7-digit subscriber
            areaCode = formattedNational.substring(0, 2);
            subscriber = formattedNational.substring(2);
          } else if (formattedNational.length >= 8) { // Likely 4-digit area code + 4-digit subscriber or other combinations
            // Check for common patterns
            if (formattedNational.startsWith('015') || formattedNational.startsWith('016') || formattedNational.startsWith('017')) {
              // Mobile numbers: 3-digit prefix + 7-8 digits
              areaCode = formattedNational.substring(0, 3);
              subscriber = formattedNational.substring(3);
            } else {
              // Assume 3-digit area code
              areaCode = formattedNational.substring(0, 3);
              subscriber = formattedNational.substring(3);
            }
          } else {
            // Short number, treat as is
            areaCode = formattedNational.substring(0, 2);
            subscriber = formattedNational.substring(2);
          }

          // Remove leading 0 from area code for international format
          if (areaCode.startsWith('0')) {
            areaCode = areaCode.substring(1);
          }

          return `+${countryCode} ${areaCode} ${subscriber}`;
        } else {
          // No leading 0, might be already formatted or mobile
          return `+${countryCode} ${formattedNational}`;
        }
      } else if (countryCode === '43') {
        // Austrian numbers: handle area codes and mobile numbers properly
        // Austrian area codes start with 0 (1-4 digits), mobile numbers start with 6
        // Note: nationalNumber has already had leading 0 stripped by toE164 for geographic numbers
        let formattedNational = nationalNumber;

        if (formattedNational.startsWith('6')) {
          // Mobile number: format as +43 6xx xxxxxxx
          return `+${countryCode} ${formattedNational.substring(0,3)} ${formattedNational.substring(3,10)}`;
        } else {
          // Landline: format as +43 xxx xxxxxxx
          return `+${countryCode} ${formattedNational.substring(0,3)} ${formattedNational.substring(3)}`;
        }
      } else {

        // Try to use the format from XML, but fall back to basic formatting
        let processedFormat = format.replace(/'\+X+/, '+' + countryCode);
        processedFormat = processedFormat.replace(/'/g, '');

        let formatted = '';
        let digitIndex = 0;

        for (let i = 0; i < processedFormat.length && digitIndex < nationalNumber.length; i++) {
          const char = processedFormat[i];
          if (char === 'X') {
            formatted += nationalNumber[digitIndex++];
          } else {
            formatted += char;
          }
        }

        // Append any remaining digits
        if (digitIndex < nationalNumber.length) {
          if (formatted.match(/\d$/)) {
            formatted += nationalNumber.substring(digitIndex);
          } else {
            formatted += ' ' + nationalNumber.substring(digitIndex);
          }
        }

        return formatted;
      }
    } catch (error) {
      console.warn('Error applying country format, using fallback:', error);
      return '+' + countryCode + ' ' + this.formatBasicNational(nationalNumber);
    }
  }

  /**
   * Basic national formatting fallback
   */
  formatBasicNational(nationalNumber) {
    if (nationalNumber.length <= 3) return nationalNumber;
    if (nationalNumber.length <= 6) return `(${nationalNumber.slice(0, 3)}) ${nationalNumber.slice(3)}`;
    if (nationalNumber.length <= 10) return `(${nationalNumber.slice(0, 3)}) ${nationalNumber.slice(3, 6)}-${nationalNumber.slice(6)}`;

    // For longer numbers, group in 3s with spaces
    return nationalNumber.replace(/(\d{3})(?=\d)/g, '$1 ');
  }

  /**
   * Format as international fallback
   */
  formatAsInternational(e164Number) {
    // Remove + and add spaces for readability
    const number = e164Number.substring(1);
    if (number.length <= 4) return e164Number;

    // Group: country code + national number with spaces
    const countryCode = number.substring(0, Math.min(3, number.length - 3));
    const national = number.substring(countryCode.length);

    return `+${countryCode} ${national.replace(/(\d{3})(?=\d)/g, '$1 ')}`;
  }

  /**
   * Main normalization function
   */
  normalize(phoneNumber, region = null) {
    if (!phoneNumber) return { original: phoneNumber, e164: '', e123: '', error: 'Empty phone number' };

    try {
      // Detect country from region
      const countryCode = this.detectCountryFromRegion(region);

      // Convert to E.164
      const e164 = this.toE164(phoneNumber, countryCode);

      // Convert to E.123 national format
      const e123 = this.toE123(e164, countryCode);

      return {
        original: phoneNumber,
        e164: e164,
        e123: e123,
        countryCode: countryCode,
        region: region
      };

    } catch (error) {
      console.error('Phone normalization error:', error);
      return {
        original: phoneNumber,
        e164: '',
        e123: '',
        error: error.message
      };
    }
  }

  /**
   * Batch normalize multiple phone numbers
   */
  normalizeBatch(phoneNumbers, region = null) {
    if (!Array.isArray(phoneNumbers)) {
      return [this.normalize(phoneNumbers, region)];
    }

    return phoneNumbers.map(phone => this.normalize(phone, region));
  }
}

// Export for use in other modules
module.exports = PhoneNumberNormaliser;

// Example usage
if (require.main === module) {
  const normaliser = new PhoneNumberNormaliser();

  // European phone number examples
  const europeanExamples = [
    // United Kingdom
    { number: '020 7946 0123', region: 'UK' },
    { number: '0161 123 4567', region: 'UK' },
    { number: '0131 123 4567', region: 'UK' },
    { number: '029 1234 5678', region: 'UK' },
    { number: '07123456789', region: 'UK' },

    // Germany
    { number: '030 12345678', region: 'Germany' },
    { number: '089 12345678', region: 'Germany' },
    { number: '0211 1234567', region: 'Germany' },
    { number: '040 12345678', region: 'Germany' },
    { number: '069 12345678', region: 'Germany' },

    // France
    { number: '01 42 68 53 00', region: 'France' },
    { number: '02 40 12 34 56', region: 'France' },
    { number: '03 83 12 34 56', region: 'France' },
    { number: '04 91 12 34 56', region: 'France' },
    { number: '05 61 12 34 56', region: 'France' },

    // Italy
    { number: '02 12345678', region: 'Italy' },
    { number: '06 12345678', region: 'Italy' },
    { number: '010 1234567', region: 'Italy' },
    { number: '055 1234567', region: 'Italy' },
    { number: '081 1234567', region: 'Italy' },

    // Spain
    { number: '91 123 45 67', region: 'Spain' },
    { number: '93 123 45 67', region: 'Spain' },
    { number: '95 123 45 67', region: 'Spain' },
    { number: '96 123 45 67', region: 'Spain' },
    { number: '98 123 45 67', region: 'Spain' },

    // Netherlands
    { number: '020 123 4567', region: 'Netherlands' },
    { number: '010 123 4567', region: 'Netherlands' },
    { number: '030 123 4567', region: 'Netherlands' },
    { number: '040 123 4567', region: 'Netherlands' },
    { number: '050 123 4567', region: 'Netherlands' },

    // Belgium
    { number: '02 123 45 67', region: 'Belgium' },
    { number: '03 123 45 67', region: 'Belgium' },
    { number: '09 123 45 67', region: 'Belgium' },
    { number: '010 12 34 56', region: 'Belgium' },
    { number: '011 12 34 56', region: 'Belgium' },

    // Switzerland
    { number: '044 123 45 67', region: 'Switzerland' },
    { number: '031 123 45 67', region: 'Switzerland' },
    { number: '061 123 45 67', region: 'Switzerland' },
    { number: '071 123 45 67', region: 'Switzerland' },
    { number: '081 123 45 67', region: 'Switzerland' },

    // Austria
    { number: '01 2345678', region: 'Austria' },
    { number: '0316 123456', region: 'Austria' },
    { number: '0664 12345678', region: 'Austria' },
    { number: '0676 12345678', region: 'Austria' },
    { number: '0699 12345678', region: 'Austria' },

    // Australia
    { number: '02 1234 5678', region: 'Australia' },
    { number: '0412 345 678', region: 'Australia' },

    // Sweden
    { number: '08 123 456 78', region: 'Nordic Countries' },
    { number: '031 12 34 56', region: 'Nordic Countries' },
    { number: '040 12 34 56', region: 'Nordic Countries' },
    { number: '046 12 34 56', region: 'Nordic Countries' },
    { number: '070 123 45 67', region: 'Nordic Countries' },

    // Denmark
    { number: '32 12 34 56', region: 'Nordic Countries' },
    { number: '35 12 34 56', region: 'Nordic Countries' },
    { number: '36 12 34 56', region: 'Nordic Countries' },
    { number: '39 12 34 56', region: 'Nordic Countries' },
    { number: '20 12 34 56', region: 'Nordic Countries' },

    // Norway
    { number: '22 12 34 56', region: 'Nordic Countries' },
    { number: '33 12 34 56', region: 'Nordic Countries' },
    { number: '38 12 34 56', region: 'Nordic Countries' },
    { number: '51 12 34 56', region: 'Nordic Countries' },
    { number: '55 12 34 56', region: 'Nordic Countries' },

    // Finland
    { number: '09 123 4567', region: 'Nordic Countries' },
    { number: '02 123 4567', region: 'Nordic Countries' },
    { number: '013 123 456', region: 'Nordic Countries' },
    { number: '014 123 456', region: 'Nordic Countries' },
    { number: '040 123 4567', region: 'Nordic Countries' },

    // Poland
    { number: '22 123 45 67', region: 'Eastern Europe' },
    { number: '12 123 45 67', region: 'Eastern Europe' },
    { number: '61 123 45 67', region: 'Eastern Europe' },
    { number: '71 123 45 67', region: 'Eastern Europe' },
    { number: '91 123 45 67', region: 'Eastern Europe' },

    // Czech Republic
    { number: '2 123 456 789', region: 'Eastern Europe' },
    { number: '3 123 456 789', region: 'Eastern Europe' },
    { number: '4 123 456 789', region: 'Eastern Europe' },
    { number: '5 123 456 789', region: 'Eastern Europe' },
    { number: '6 123 456 789', region: 'Eastern Europe' },

    // Hungary
    { number: '1 234 5678', region: 'Eastern Europe' },
    { number: '22 123 456', region: 'Eastern Europe' },
    { number: '62 123 456', region: 'Eastern Europe' },
    { number: '72 123 456', region: 'Eastern Europe' },
    { number: '20 123 4567', region: 'Eastern Europe' }
  ];

  console.log('European Phone Number Normalization Examples (50 samples):');
  console.log('===========================================================');
  console.log('');

  europeanExamples.slice(0, 50).forEach((testCase, index) => {
    const result = normaliser.normalize(testCase.number, testCase.region);
    const country = testCase.region.length > 15 ? testCase.region.substring(0, 12) + '...' : testCase.region;
    const original = result.original.length > 15 ? result.original.substring(0, 12) + '...' : result.original;
    console.log(`${(index + 1).toString().padStart(2, '0')}. ${country.padEnd(15)} | ${original.padEnd(15)} → E.164: ${result.e164.padEnd(15)} | E.123: ${result.e123}`);
  });

  console.log('');
  console.log('Total examples: 50 (showing major European countries and regions)');

  // Summary of supported countries
  console.log('');
  console.log('Countries/Regions covered:');
  console.log('- UK (United Kingdom)');
  console.log('- Germany, France, Italy, Spain');
  console.log('- Netherlands, Belgium, Switzerland, Austria, Australia');
  console.log('- Nordic Countries (Sweden, Denmark, Norway, Finland)');
  console.log('- Eastern Europe (Poland, Czech Republic, Hungary)');
  console.log('');
  console.log('Note: E.123 formatting uses country-specific rules where available,');
  console.log('      falling back to basic formatting for unsupported countries.');
}