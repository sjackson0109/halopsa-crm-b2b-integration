-- SQL View for Contacts with E.164 Formatted Phone Numbers
-- This view displays contact information with phone numbers in E.164 international format
--
-- IMPORTANT: This view assumes phone numbers in the contacts table are ALREADY normalized
-- to E.164 format using the phone-number-normaliser.js script.
--
-- E.123 (national format) formatting cannot be fully replicated in SQL due to the complexity
-- of country-specific rules, sub-conditions, and the hundreds of countries/regions supported
-- by the JavaScript normaliser (using XML data, regex patterns, and conditional logic).
--
-- For E.123 formatting, use the phone-number-normaliser.js script at the application level
-- or consider storing both E.164 and E.123 formats in the database.
--
-- To normalize phone numbers:
-- 1. Use the phone-number-normaliser.js script to process contact data
-- 2. Store the normalized E.164 format in the phone column
-- 3. Use this view to display the normalized E.164 data

CREATE VIEW contacts_e164_view AS
SELECT
    id,
    first_name,
    last_name,
    company,
    phone AS e164_phone_number,
    CASE
        WHEN phone LIKE '+%' THEN 'Already E.164 formatted'
        ELSE 'May need normalisation'
    END AS normalisation_status,
    email,
    created_date,
    updated_date
FROM contacts
WHERE phone IS NOT NULL AND phone != ''
ORDER BY last_name, first_name;

-- Usage example:
-- SELECT * FROM contacts_e164_view WHERE normalisation_status = 'Already E.164 formatted';
-- This shows contacts with properly formatted E.164 phone numbers