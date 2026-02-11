# Phone Number Normaliser

A utility for normalising phone numbers to standardised formats for CRM integration.

## Features

- **E.164 Format**: International standard (+1234567890)
- **E.123 Format**: National format for human readability ((123) 456-7890)
- **Country Detection**: Uses CRM region field to determine country-specific formatting
- **Multiple Input Formats**: Handles various input formats (with/without country codes, different separators)
- **Fallback Formatting**: Graceful handling of unknown countries

## Usage

```javascript
const PhoneNumberNormaliser = require('./phone-number-normaliser');

const normaliser = new PhoneNumberNormaliser();

// Normalise a single phone number
const result = normaliser.normalise('(555) 123-4567', 'USA');
console.log(result);
// {
//   original: '(555) 123-4567',
//   e164: '+15551234567',
//   e123: '+1 555-123-4567',
//   countryCode: '1',
//   region: 'USA'
// }

// Batch normalise multiple numbers
const results = normaliser.normaliseBatch(['+44 20 7946 0123', '07123456789'], 'UK');
```

## Supported Regions

The utility recognises regions and maps them to country codes:

- **UK**: United Kingdom → 44
- **USA**: United States → 1
- **Germany**: Germany → 49
- **France**: France → 33
- And 50+ other regions...

## Output Formats

### E.164 (International)
- Always starts with `+`
- Contains country code + national number
- Example: `+15551234567`

### E.123 (National)
- Human-readable format for the specific country
- Examples:
  - US: `+1 555-123-4567`
  - UK: `+44 20 7946 0123`
  - Germany: `+49 30 12345678`

## Integration with HaloPSA CRM

This utility is designed to work with the HaloPSA CRM custom fields:

1. **Input**: Phone numbers from B2B data sources
2. **Processing**: Normalise to E.164 for storage, E.123 for display
3. **Storage**: Store E.164 in CF_PrimaryPhone_E164
4. **Display**: Show E.123 in CF_PrimaryPhone_Display for manual dialing

## Dependencies

- `@xmldom/xmldom`: XML parsing for country code data
- `e164_e123_country_code_table.xml`: Country-specific formatting rules

## Examples

```javascript
// US number from Apollo.io
normaliser.normalise('555.123.4567', 'USA');
// → { e164: '+15551234567', e123: '+1 555-123-4567' }

// UK number from ZoomInfo
normaliser.normalise('020 7946 0123', 'UK');
// → { e164: '+4402079460123', e123: '+44 020 794 60123' }

// International number
normaliser.normalise('+33 1 42 68 53 00', 'France');
// → { e164: '+33142685300', e123: '+33 1 42 68 53 00' }
```</content>
<parameter name="filePath">c:\Users\Administrator\Documents\HaloPSA CRM Custom Integration\examples\custom-fuctions\README.md