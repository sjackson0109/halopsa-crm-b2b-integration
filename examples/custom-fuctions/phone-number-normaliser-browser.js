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
    this.dataLoaded = false;
    // Start loading data immediately but don't wait for it
    this.loadCountryData();
  }

  /**
   * Load country code data - browser compatible version
   */
  async loadCountryData() {
    try {
      const response = await fetch('./e164_e123_country_code_table.xml');
      if (!response.ok) {
        throw new Error(`Failed to fetch XML: ${response.status}`);
      }
      const xmlText = await response.text();
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, 'text/xml');
      
      // Check for XML parsing errors
      const parserError = doc.getElementsByTagName('parsererror');
      if (parserError.length > 0) {
        throw new Error('XML parsing failed');
      }
      
      this.countryData = {};
      const entries = doc.getElementsByTagName('Entry');
      
      console.log(`Found ${entries.length} entries in XML`);

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const callingCode = entry.getElementsByTagName('calling_code')[0]?.textContent;

        if (callingCode) {
          const numberFormat = entry.getElementsByTagName('number_format')[0]?.textContent || '';
          this.countryData[callingCode] = {
            country: entry.getElementsByTagName('country')[0]?.textContent || '',
            territories: entry.getElementsByTagName('itu_territories')[0]?.textContent || '',
            internationalPrefix: entry.getElementsByTagName('itu_international_prefix')[0]?.textContent || '',
            nsnLengths: entry.getElementsByTagName('e164_nsn_lengths')[0]?.textContent || '',
            prefixRegex: entry.getElementsByTagName('prefix_regex')[0]?.textContent || '',
            lengthRegex: entry.getElementsByTagName('e164_length_regex')[0]?.textContent || '',
            numberFormat: numberFormat
          };
          
          // Debug log for specific countries
          if (callingCode === '1' || callingCode === '44') {
            console.log(`Country ${callingCode}: format="${numberFormat}"`);
          }
        }
      }
      
      console.log(`Loaded ${Object.keys(this.countryData).length} country entries from XML`);
      this.dataLoaded = true;
    } catch (error) {
      console.warn('Error loading XML country data, using fallback:', error);
      // Fallback to embedded data if XML fails to load
      this.countryData = this.getEmbeddedCountryData();
      this.dataLoaded = true;
      console.log(`Using embedded fallback data with ${Object.keys(this.countryData).length} countries`);
    }
  }

  /**
   * Embedded country data for browser compatibility - MINIMAL FALLBACK ONLY
   * This should NOT contain format patterns - those come ONLY from XML
   * This is just a safety net to prevent crashes if XML fails to load
   * 
   * When XML is available, this is overridden completely
   */
  getEmbeddedCountryData() {
    // Populate with data from XML for common countries
    // This allows the demo to work even when opened via file:// protocol
    return {
      '1': {
        country: 'Shared',
        territories: 'American Samoa; Anguilla; Antigua and Barbuda; Bahamas; Barbados; Bermuda; British Virgin Islands; Canada; Cayman Islands; Dominica; Dominican Rep.; Grenada; Guam; Jamaica; Montserrat; Northern Marianas; Puerto Rico; Saint Lucia; Saint Vincent and the; Sint Maarten (Dutch part); Turks and Caicos Islands; United States; United States Virgin Islands; and Tristan da Cunha Saint Kitts and Nevis; international service, shared code Trinidad and Tobago',
        internationalPrefix: '0; 011',
        nsnLengths: '7,10',
        prefixRegex: '^\\+1',
        lengthRegex: '^\\+1(?:\\d{7}|\\d{10})$',
        numberFormat: "'+X XXX-XXX-XXXX"
      },
      '44': {
        country: 'United Kingdom',
        territories: 'Guernsey; Isle of Man; Jersey; United Kingdom',
        internationalPrefix: '00',
        nsnLengths: '10,11',
        prefixRegex: '^\\+44',
        lengthRegex: '^\\+44(?:\\d{7}|\\d{9}|\\d{10})$',
        numberFormat: "'+XX XXXX XXX XXX"
      },
      '33': {
        country: 'France',
        territories: 'France; Guadeloupe; Martinique; Mayotte; Reunion',
        internationalPrefix: '00',
        nsnLengths: '9',
        prefixRegex: '^\\+33',
        lengthRegex: '^\\+33[0-9]{9}$',
        numberFormat: "'+XX X XX XX XX XX"
      },
      '49': {
        country: 'Germany',
        territories: 'Germany',
        internationalPrefix: '00',
        nsnLengths: '10,11',
        prefixRegex: '^\\+49',
        lengthRegex: '^\\+49[0-9]{10,11}$',
        numberFormat: "'+XX XX XXXXXX"
      },
      '61': {
        country: 'Australia',
        territories: 'Australia; Christmas Island; Cocos (Keeling) Islands; Norfolk Island',
        internationalPrefix: '0011',
        nsnLengths: '9',
        prefixRegex: '^\\+61',
        lengthRegex: '^\\+61[0-9]{9}$',
        numberFormat: "'+XX X XXXX XXXX"
      },
      '81': {
        country: 'Japan',
        territories: 'Japan',
        internationalPrefix: '010',
        nsnLengths: '10,11',
        prefixRegex: '^\\+81',
        lengthRegex: '^\\+81[0-9]{10,11}$',
        numberFormat: "'+XX XX XXXX XXXX"
      },
      '86': {
        country: 'China',
        territories: 'China (mainland); China (Hong Kong); China (Macao); China (Taiwan)',
        internationalPrefix: '00',
        nsnLengths: '11',
        prefixRegex: '^\\+86',
        lengthRegex: '^\\+86[0-9]{11}$',
        numberFormat: "'+XX XXX XXXX XXXX"
      },
      '91': {
        country: 'India',
        territories: 'India',
        internationalPrefix: '00',
        nsnLengths: '10',
        prefixRegex: '^\\+91',
        lengthRegex: '^\\+91[0-9]{10}$',
        numberFormat: "'+XX XXXXX XXXXX"
      }
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
   * Detect country code from phone number
   */
  detectCountryCode(phoneNumber) {
    if (!phoneNumber) return '1';
    
    let digits = phoneNumber.replace(/[^\d]/g, ''); // Get only digits
    
    // If it starts with +, remove it for processing
    if (phoneNumber.startsWith('+')) {
      // Already handled - extract digits and proceed
    }
    
    // Special case: US/Canada numbers often don't include country code
    // Check for typical US/Canada patterns first
    if (digits.length === 10 && !phoneNumber.startsWith('+')) {
      // 10-digit number without country code is likely US/Canada
      return '1';
    }
    
    // List of country codes sorted by length (longest first to avoid false matches)
    const countryCodes = [
      // 4-digit codes
      '1242', '1246', '1264', '1268', '1284', '1340', '1345', '1441', '1473', '1649', '1664', '1670', '1671', '1684', '1721', '1758', '1767', '1784', '1787', '1809', '1829', '1849', '1868', '1869', '1876', '1939',
      // 3-digit codes  
      '212', '213', '216', '218', '220', '221', '222', '223', '224', '225', '226', '227', '228', '229', '230', '231', '232', '233', '234', '235', '236', '237', '238', '239', '240', '241', '242', '243', '244', '245', '246', '248', '249', '250', '251', '252', '253', '254', '255', '256', '257', '258', '260', '261', '262', '263', '264', '265', '266', '267', '268', '269', '290', '291', '297', '298', '299', '350', '351', '352', '353', '354', '355', '356', '357', '358', '359', '370', '371', '372', '373', '374', '375', '376', '377', '378', '380', '381', '382', '383', '385', '386', '387', '389', '420', '421', '423', '500', '501', '502', '503', '504', '505', '506', '507', '508', '509', '590', '591', '592', '593', '594', '595', '596', '597', '598', '599', '670', '672', '673', '674', '675', '676', '677', '678', '679', '680', '681', '682', '683', '684', '685', '686', '687', '688', '689', '690', '691', '692', '850', '852', '853', '855', '856', '880', '886', '960', '961', '962', '963', '964', '965', '966', '967', '968', '970', '971', '972', '973', '974', '975', '976', '977', '992', '993', '994', '995', '996', '998',
      // 2-digit codes
      '20', '27', '30', '31', '32', '33', '34', '36', '39', '40', '41', '43', '44', '45', '46', '47', '48', '49', '51', '52', '53', '54', '55', '56', '57', '58', '60', '61', '62', '63', '64', '65', '66', '81', '82', '84', '86', '90', '91', '92', '93', '94', '95', '98',
      // 1-digit codes
      '7', '1'
    ];
    
    // Try to match country codes (longest first to avoid false positives)
    for (const code of countryCodes) {
      if (digits.startsWith(code)) {
        // Validate that the remaining digits make sense for this country
        const remainingDigits = digits.length - code.length;
        
        // Basic length validation (most countries have 7-11 digit national numbers)
        if (remainingDigits >= 7 && remainingDigits <= 11) {
          return code;
        }
      }
    }
    
    return '1'; // Default to US
  }

  /**
   * Convert phone number to E.164 format
   */
  toE164(phoneNumber, countryCode = '1') {
    if (!phoneNumber) return '';

    // Handle already formatted E.164 numbers (starts with +)
    if (phoneNumber.startsWith('+')) {
      const digits = phoneNumber.replace(/[^\d+]/g, ''); // Keep only digits and +
      const match = digits.match(/^\+(\d+)$/);
      return match ? digits : ''; // Return the clean E.164 format
    }

    // For non-E.164 numbers, strip non-numeric and apply country code
    let digits = this.stripNonNumeric(phoneNumber);

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
      // Fix regex to handle different E.164 formats better
      const cleanNumber = e164Number.replace(/[^\d+]/g, ''); // Remove all non-digits except +
      const match = cleanNumber.match(/^\+(\d{1,4})(\d+)$/);
      if (!match || match.length < 3) {
        console.warn('Invalid E.164 format:', e164Number);
        return e164Number; // Return original if can't parse
      }
      detectedCountryCode = match[1];
      nationalNumber = match[2];
    }

    // Ensure countryData exists
    if (!this.countryData) {
      console.warn('Country data not loaded');
      return this.formatAsInternational(e164Number);
    }

    const targetCountryCode = countryCode || detectedCountryCode;
    const countryInfo = this.countryData[targetCountryCode];

    if (!countryInfo) {
      return this.formatAsInternational(e164Number);
    }

    return this.applyCountryFormatting(nationalNumber, countryInfo, targetCountryCode);
  }

  /**
   * Apply country-specific E.123 formatting using XML rules
   */
  applyCountryFormatting(nationalNumber, countryInfo, countryCode) {
    const format = countryInfo.numberFormat;

    if (!format) {
      // Fallback to basic grouping if no format specified in XML
      return '+' + countryCode + ' ' + this.formatBasicNational(nationalNumber);
    }

    try {
      // Use the XML-defined number format pattern for all countries
      return this.applyE123Pattern(nationalNumber, countryCode, format);
      
    } catch (error) {
      console.warn('Error applying XML formatting, using fallback:', error);
      return '+' + countryCode + ' ' + this.formatBasicNational(nationalNumber);
    }
  }

  /**
   * Apply E.123 pattern from XML format specification
   */
  applyE123Pattern(nationalNumber, countryCode, formatPattern) {
    if (!formatPattern) {
      return '+' + countryCode + ' ' + this.formatBasicNational(nationalNumber);
    }

    try {
      // XML patterns include country code digits as X's (e.g., "'+X XXX-XXX-XXXX" for +1)
      // So prepend the country code to the national number for pattern matching
      const fullNumber = countryCode + nationalNumber;
      
      // Remove leading quote if present (e.g., "'+X XXX-XXX-XXXX" -> "+X XXX-XXX-XXXX")
      let pattern = formatPattern.replace(/^'/, '');
      
      // Build result by matching pattern characters to digits
      let result = '';
      let digitIndex = 0;
      
      for (let i = 0; i < pattern.length && digitIndex < fullNumber.length; i++) {
        const patternChar = pattern[i];
        
        if (patternChar === 'X' || patternChar === 'x') {
          // Replace X with next digit from full number (country code + national)
          result += fullNumber[digitIndex];
          digitIndex++;
        } else {
          // Keep literal characters (spaces, dashes, parentheses, etc.)
          result += patternChar;
        }
      }
      
      // Add any remaining digits
      if (digitIndex < fullNumber.length) {
        result += fullNumber.substring(digitIndex);
      }
      
      return result;
      
    } catch (error) {
      console.warn('Error parsing XML format pattern:', formatPattern, error);
      return '+' + countryCode + ' ' + this.formatBasicNational(nationalNumber);
    }
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
   * Wait for country data to be loaded
   */
  async ensureDataLoaded() {
    if (this.dataLoaded) return;
    
    // Wait for data to load (max 5 seconds)
    let attempts = 0;
    while (!this.dataLoaded && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!this.dataLoaded) {
      console.warn('Timeout waiting for country data, using embedded fallback');
      this.countryData = this.getEmbeddedCountryData();
      this.dataLoaded = true;
    }
  }

  /**
   * Main normalise function
   */
  async normalise(phoneNumber, region = null) {
    if (!phoneNumber) return { original: phoneNumber, e164: '', e123: '', error: 'Empty phone number' };

    // Ensure country data is loaded
    await this.ensureDataLoaded();

    try {
      // If region is provided, use it as the preferred region (don't auto-detect)
      let countryCode;
      let preferredRegion = null;
      
      if (region) {
        // User specified a region - use it
        preferredRegion = region.toUpperCase();
        countryCode = this.detectCountryFromRegion(region);
      } else {
        // Auto-detect country from the phone number itself
        countryCode = this.detectCountryCode(phoneNumber);
      }

      const e164 = this.toE164(phoneNumber, countryCode);
      const e123 = this.toE123(e164, countryCode);

      // Use preferred region if user specified it, otherwise detect from country code
      const detectedRegion = preferredRegion || this.getRegionFromCountryCode(countryCode);

      return {
        original: phoneNumber,
        e164: e164,
        e123: e123,
        countryCode: countryCode,
        region: detectedRegion
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
  async normaliseBatch(phoneNumbers, region = null) {
    if (!Array.isArray(phoneNumbers)) {
      return [await this.normalise(phoneNumbers, region)];
    }

    await this.ensureDataLoaded();
    const results = [];
    for (const phone of phoneNumbers) {
      results.push(await this.normalise(phone, region));
    }
    return results;
  }

  /**
   * Get region/country name from country code
   */
  getRegionFromCountryCode(countryCode) {
    if (!this.countryData || !countryCode) return null;
    
    const countryInfo = this.countryData[countryCode];
    if (!countryInfo) return null;
    
    // Try to extract region from territories first (more reliable)
    if (countryInfo.territories) {
      const territories = countryInfo.territories.toLowerCase();
      
      // Map common territory codes to region codes
      // For country code 1, prefer USA over Canada (shared code)
      if (countryCode === '1') {
        if (territories.includes('united states') || territories.includes('usa')) return 'US';
        if (territories.includes('canada')) return 'CA';
      }
      if (territories.includes('usa')) return 'US';
      if (territories.includes('canada')) return 'CA';
      if (territories.includes('gbr') || territories.includes('united kingdom')) return 'UK';
      if (territories.includes('germany') || territories.includes('deu')) return 'DE';
      if (territories.includes('france') || territories.includes('fra')) return 'FR';
      if (territories.includes('australia') || territories.includes('aus')) return 'AU';
      if (territories.includes('japan') || territories.includes('jpn')) return 'JP';
      if (territories.includes('china') || territories.includes('chn')) return 'CN';
      if (territories.includes('india') || territories.includes('ind')) return 'IN';
      
      // Return first territory code
      const firstTerritory = countryInfo.territories.split(';')[0].trim();
      return firstTerritory.length <= 3 ? firstTerritory.toUpperCase() : firstTerritory;
    }
    
    // Fall back to country field
    if (countryInfo.country) {
      const country = countryInfo.country.toLowerCase();
      if (country.includes('united states')) return 'US';
      if (country.includes('canada')) return 'CA';
      if (country.includes('united kingdom')) return 'UK';
      if (country.includes('germany')) return 'DE';
      if (country.includes('france')) return 'FR';
      if (country.includes('australia')) return 'AU';
      if (country.includes('japan')) return 'JP';
      if (country.includes('china')) return 'CN';
      if (country.includes('india')) return 'IN';
    }
    
    return null;
  }

  /**
   * Static method for quick normalisation without instantiating class
   */
  static async quickNormalise(phoneNumber, region = 'US') {
    const normaliser = new PhoneNumberNormaliser();
    return await normaliser.normalise(phoneNumber, region);
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