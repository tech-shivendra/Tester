const fs = require('fs');

const envContent = `export const ENV = {
    GEMINI_API_KEY: "${process.env.GEMINI_API_KEY || ''}",
    FIREBASE_API_KEY: "${process.env.FIREBASE_API_KEY || ''}"
};
`;

fs.writeFileSync('./js/env.js', envContent);
console.log('Successfully generated js/env.js');
