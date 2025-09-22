const express = require('express');
const path = require('path');
const router = express.Router();

/**
 * Serve Swagger UI for Admin API Documentation
 * Accessible at: /api/docs/admin
 */
router.get('/admin', (req, res) => {
    const htmlPath = path.join(__dirname, '../swagger/admin-docs.html');
    res.sendFile(htmlPath);
});

/**
 * Serve Swagger YAML file for Admin API
 * Accessible at: /api/docs/admin-api.yaml
 */
router.get('/admin-api.yaml', (req, res) => {
    const yamlPath = path.join(__dirname, '../swagger/admin-api.yaml');
    res.setHeader('Content-Type', 'text/yaml');
    res.sendFile(yamlPath);
});

/**
 * Documentation index page
 */
router.get('/', (req, res) => {
    res.json({
        message: 'API Absensi Documentation',
        availableDocs: {
            admin: {
                description: 'Admin Panel API Documentation',
                url: '/api/docs/admin',
                swagger_spec: '/api/docs/admin-api.yaml'
            }
        },
        info: {
            version: '1.0.0',
            title: 'API Absensi System',
            description: 'Complete attendance management system with hierarchical organization structure'
        }
    });
});

module.exports = router;