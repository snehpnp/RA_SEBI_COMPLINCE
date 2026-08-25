const postmanToOpenApi = require('postman-to-openapi');
const path = require('path');

const postmanCollection = path.join(__dirname, 'RAGCP_Postman_Collection.json');
const outputFile = path.join(__dirname, 'swagger-output.yml');

// Async/await
async function generateSwagger() {
    try {
        await postmanToOpenApi(postmanCollection, outputFile, { defaultTag: 'General' });
        
        // Fix the undefined://{{base_url}} issue
        const fs = require('fs');
        let yamlContent = fs.readFileSync(outputFile, 'utf8');
        yamlContent = yamlContent.replace(
            'servers:\n  - url: undefined://{{base_url}}', 
            'servers:\n  - url: http://localhost:5000\n    description: Local Server\n  - url: https://compliance.pnpuniverse.in/backend\n    description: Production Server'
        );
        // Also remove any remaining {{base_url}} strings from paths if they exist
        yamlContent = yamlContent.replace(/\{\{base_url\}\}/g, '');
        
        fs.writeFileSync(outputFile, yamlContent);
        
        console.log(`Swagger UI Output Generated at ${outputFile}`);
    } catch (err) {
        console.error('Error generating Swagger from Postman:', err);
    }
}

generateSwagger();
