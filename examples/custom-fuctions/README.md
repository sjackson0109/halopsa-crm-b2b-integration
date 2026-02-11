# Phone Number Normaliser

A utility for normalising phone numbers to standardised formats for CRM integration.

## Available Versions

- **`phone-number-normaliser.js`**: Node.js version with full XML parsing
- **`phone-number-normaliser-browser.js`**: Browser-compatible version with embedded country data
- **`phone-normaliser-browser-demo.html`**: Live browser demo

## Features

- **E.164 Format**: International standard (+1234567890)
- **E.123 Format**: National format for human readability ((123) 456-7890)
- **Country Detection**: Uses CRM region field to determine country-specific formatting
- **Multiple Input Formats**: Handles various input formats (with/without country codes, different separators)
- **Fallback Formatting**: Graceful handling of unknown countries
- **Cross-Platform**: Works in Node.js and web browsers

## Usage

### Node.js Version
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

### Browser Version
```html
<!-- Include the script -->
<script src="phone-number-normaliser-browser.js"></script>

<script>
// Create normaliser instance
const normaliser = new PhoneNumberNormaliser();

// Single number
const result = normaliser.normalise('(555) 123-4567', 'USA');
console.log(result);

// Quick static method
const quickResult = PhoneNumberNormaliser.quickNormalise('555.123.4567');

// Batch processing
const batchResults = normaliser.normaliseBatch(['020 7946 0123', '555-123-4567'], 'UK');
</script>
```

**Browser Demo**: Open `phone-normaliser-browser-demo.html` in your web browser for a live demonstration.

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

### Node.js Version
- `@xmldom/xmldom`: XML parsing for country code data
- `e164_e123_country_code_table.xml`: Country-specific formatting rules

### Browser Version
- No external dependencies
- Uses native browser `DOMParser` if XML loading is enabled
- Embedded country data for reliability

## Browser Compatibility

The browser version (`phone-number-normaliser-browser.js`) is compatible with:

- ✅ **Modern Browsers**: Chrome 60+, Firefox 55+, Safari 12+, Edge 79+
- ✅ **Mobile Browsers**: iOS Safari 12+, Chrome Mobile 60+
- ✅ **Module Systems**: CommonJS (Node.js), AMD (RequireJS), Global variables
- ✅ **Zero Dependencies**: No external libraries required
- ✅ **Offline Ready**: Embedded country data, no external API calls

### Browser Features Used:
- ES6 Classes (widely supported)
- Template literals (widely supported)  
- Arrow functions (widely supported)
- Optional: `fetch()` API (for XML loading, if enabled)

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