/**
 * Phone Number Normalisation Utility - Browser Compatible Version
 *
 * Converts phone numbers to standardised formats for CRM integration:
 * - E.164: International standard (+1234567890)
 * - E.123: National format for human readability ((123) 456-7890)
 *
 * Features:
 * - Strips non-numeric characters
 * - Detects country from CRM region field
 * - Validates number formats
 * - Handles international prefixes
 * - Provides fallback formatting
 * - Works in web browsers (no Node.js dependencies)
 */

class PhoneNumberNormaliser {
  constructor() {
    this.countryData = null;
    this.loadCountryData();
  }

  /**
   * Load country code data - browser compatible version
   */
  async loadCountryData() {
    try {
      // Option 1: Load from external XML file via fetch
      // Uncomment this if you want to load XML dynamically:
      /*
      const response = await fetch('./e164_e123_country_code_table.xml');
      const xmlText = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, 'text/xml');
      */

      // Option 2: Embedded country data (more reliable for browsers)
      this.countryData = this.getEmbeddedCountryData();

      // If using XML fetch, uncomment and remove embedded data:
      /*
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
            numberFormat: entry.getElementsByTagName('e123_national_format')[0]?.textContent || ''
          };
        }
      }
      */
    } catch (error) {
      console.error('Error loading country data:', error);
      this.countryData = this.getEmbeddedCountryData(); // Fallback to embedded
    }
  }

  /**
   * Embedded country data for browser compatibility
   * This contains the most common country codes and formats
   */
  getEmbeddedCountryData() {
    return {
      '1': {
        country: 'United States, Canada',
        territories: 'USA, CAN',
        internationalPrefix: '011',
        nsnLengths: '10',
        prefixRegex: '^1',
        lengthRegex: '^1[0-9]{10}$',
        numberFormat: '+1 (XXX) XXX-XXXX'
      },
      '44': {
        country: 'United Kingdom',
        territories: 'GBR',
        internationalPrefix: '00',
        nsnLengths: '10,11',
        prefixRegex: '^44',
        lengthRegex: '^44[0-9]{10,11}$',
        numberFormat: '+44 XX XXXX XXXX'
      },
      '49': {
        country: 'Germany',
        territories: 'DEU',
        internationalPrefix: '00',
        nsnLengths: '10,11,12',
        prefixRegex: '^49',
        lengthRegex: '^49[0-9]{10,12}$',
        numberFormat: '+49 XX XXXXXXXX'
      },
      '33': {
        country: 'France',
        territories: 'FRA',
        internationalPrefix: '00',
        nsnLengths: '9',
        prefixRegex: '^33',
        lengthRegex: '^33[0-9]{9}$',
        numberFormat: '+33 X XX XX XX XX'
      },
      '61': {
        country: 'Australia',
        territories: 'AUS',
        internationalPrefix: '0011',
        nsnLengths: '9',
        prefixRegex: '^61',
        lengthRegex: '^61[0-9]{9}$',
        numberFormat: '+61 X XXXX XXXX'
      },
      '81': {
        country: 'Japan',
        territories: 'JPN',
        internationalPrefix: '010',
        nsnLengths: '10,11',
        prefixRegex: '^81',
        lengthRegex: '^81[0-9]{10,11}$',
        numberFormat: '+81 XX XXXX XXXX'
      },
      '86': {
        country: 'China',
        territories: 'CHN',
        internationalPrefix: '00',
        nsnLengths: '11',
        prefixRegex: '^86',
        lengthRegex: '^86[0-9]{11}$',
        numberFormat: '+86 XXX XXXX XXXX'
      },
      '91': {
        country: 'India',
        territories: 'IND',
        internationalPrefix: '00',
        nsnLengths: '10',
        prefixRegex: '^91',
        lengthRegex: '^91[0-9]{10}$',
        numberFormat: '+91 XXXXX XXXXX'
      }
      // Add more countries as needed
    };
  }

  /**
   * Detect country code from region string
   */
  detectCountryFromRegion(region) {
    if (!region) return '1'; // Default to US/Canada

    const regionMap = {
      'usa': '1', 'us': '1', 'united states': '1', 'america': '1', 'canada': '1', 'can': '1',
      'uk': '44', 'gb': '44', 'britain': '44', 'england': '44', 'scotland': '44', 'wales': '44', 'northern ireland': '44',
      'germany': '49', 'de': '49', 'deutschland': '49',
      'france': '33', 'fr': '33',
      'australia': '61', 'au': '61', 'aus': '61',
      'japan': '81', 'jp': '81',
      'china': '86', 'cn': '86',
      'india': '91', 'in': '91'
    };

    return regionMap[region.toLowerCase()] || '1';
  }

  /**
   * Strip non-numeric characters and clean the number
   */
  stripNonNumeric(phoneNumber) {
    return phoneNumber.replace(/[^0-9]/g, '');
  }

  /**
   * Convert phone number to E.164 format
   */
  toE164(phoneNumber, countryCode = '1') {
    if (!phoneNumber) return '';

    let digits = this.stripNonNumeric(phoneNumber);

    // Handle already formatted E.164 numbers
    if (phoneNumber.startsWith('+')) {
      const match = phoneNumber.match(/^\+(\d+)$/);
      return match ? phoneNumber : '';
    }

    // Remove leading 0 for international dialing
    if (digits.startsWith('0')) {
      digits = digits.substring(1);
    }

    // If number already has country code, return as E.164
    if (digits.startsWith(countryCode) && digits.length > countryCode.length) {
      return '+' + digits;
    }

    // Add country code if not present
    if (!digits.startsWith(countryCode)) {
      digits = countryCode + digits;
    }

    return digits ? '+' + digits : '';
  }

  /**
   * Convert E.164 to E.123 national format
   */
  toE123(e164Number, countryCode = null) {
    if (!e164Number || !e164Number.startsWith('+')) return e164Number;

    let detectedCountryCode, nationalNumber;

    if (countryCode && e164Number.startsWith('+' + countryCode)) {
      detectedCountryCode = countryCode;
      nationalNumber = e164Number.substring(1 + countryCode.length).replace(/\s/g, '');
    } else {
      const match = e164Number.match(/^\+(\d{1,4})(\d+)$/);
      if (!match) return e164Number;
      detectedCountryCode = match[1];
      nationalNumber = match[2];
    }

    const targetCountryCode = countryCode || detectedCountryCode;
    const countryInfo = this.countryData[targetCountryCode];

    if (!countryInfo) {
      return this.formatAsInternational(e164Number);
    }

    return this.applyCountryFormatting(nationalNumber, countryInfo, targetCountryCode);
  }

  /**
   * Apply country-specific E.123 formatting
   */
  applyCountryFormatting(nationalNumber, countryInfo, countryCode) {
    const format = countryInfo.numberFormat;

    if (!format) {
      return '+' + countryCode + ' ' + this.formatBasicNational(nationalNumber);
    }

    // Apply specific formatting based on country
    switch (countryCode) {
      case '1': // US/Canada
        if (nationalNumber.length === 10) {
          return `+1 (${nationalNumber.substring(0, 3)}) ${nationalNumber.substring(3, 6)}-${nationalNumber.substring(6)}`;
        }
        break;

      case '44': // UK
        if (nationalNumber.length === 10) {
          return `+44 ${nationalNumber.substring(0, 2)} ${nationalNumber.substring(2, 6)} ${nationalNumber.substring(6)}`;
        }
        break;

      case '49': // Germany
        if (nationalNumber.length >= 10) {
          return `+49 ${nationalNumber.substring(0, 2)} ${nationalNumber.substring(2)}`;
        }
        break;

      case '33': // France
        if (nationalNumber.length === 9) {
          return `+33 ${nationalNumber.substring(0, 1)} ${nationalNumber.substring(1, 3)} ${nationalNumber.substring(3, 5)} ${nationalNumber.substring(5, 7)} ${nationalNumber.substring(7)}`;
        }
        break;

      default:
        return '+' + countryCode + ' ' + this.formatBasicNational(nationalNumber);
    }

    return '+' + countryCode + ' ' + this.formatBasicNational(nationalNumber);
  }

  /**
   * Basic national number formatting
   */
  formatBasicNational(nationalNumber) {
    if (nationalNumber.length <= 4) return nationalNumber;
    if (nationalNumber.length <= 7) {
      return nationalNumber.substring(0, 3) + ' ' + nationalNumber.substring(3);
    }
    return nationalNumber.substring(0, 3) + ' ' + nationalNumber.substring(3, 6) + ' ' + nationalNumber.substring(6);
  }

  /**
   * Format as international fallback
   */
  formatAsInternational(e164Number) {
    return e164Number.replace(/(\+\d{1,4})(\d{3})(\d{3})(\d+)/, '$1 $2 $3 $4');
  }

  /**
   * Main normalise function
   */
  normalise(phoneNumber, region = null) {
    if (!phoneNumber) return { original: phoneNumber, e164: '', e123: '', error: 'Empty phone number' };

    try {
      const countryCode = this.detectCountryFromRegion(region);
      const e164 = this.toE164(phoneNumber, countryCode);
      const e123 = this.toE123(e164, countryCode);

      return {
        original: phoneNumber,
        e164: e164,
        e123: e123,
        countryCode: countryCode,
        region: region
      };
    } catch (error) {
      console.error('Phone normalisation error:', error);
      return {
        original: phoneNumber,
        e164: '',
        e123: '',
        error: error.message
      };
    }
  }

  /**
   * Batch normalise multiple phone numbers
   */
  normaliseBatch(phoneNumbers, region = null) {
    if (!Array.isArray(phoneNumbers)) {
      return [this.normalise(phoneNumbers, region)];
    }

    return phoneNumbers.map(phone => this.normalise(phone, region));
  }

  /**
   * Static method for quick normalisation without instantiating class
   */
  static quickNormalise(phoneNumber, region = 'US') {
    const normaliser = new PhoneNumberNormaliser();
    return normaliser.normalise(phoneNumber, region);
  }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  // CommonJS (Node.js)
  module.exports = PhoneNumberNormaliser;
} else if (typeof define === 'function' && define.amd) {
  // AMD (RequireJS)
  define([], function() {
    return PhoneNumberNormaliser;
  });
} else {
  // Global variable for browsers
  window.PhoneNumberNormaliser = PhoneNumberNormaliser;
}

// Example usage in browser console:
/*
const normaliser = new PhoneNumberNormaliser();

// Single number
console.log(normaliser.normalise('(555) 123-4567', 'USA'));
// Output: { original: '(555) 123-4567', e164: '+15551234567', e123: '+1 (555) 123-4567', countryCode: '1', region: 'USA' }

// UK number
console.log(normaliser.normalise('020 7946 0123', 'UK'));
// Output: { original: '020 7946 0123', e164: '+442079460123', e123: '+44 20 7946 0123', countryCode: '44', region: 'UK' }

// Quick static method
console.log(PhoneNumberNormaliser.quickNormalise('555.123.4567'));
*/