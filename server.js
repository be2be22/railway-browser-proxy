const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
    res.json({
        status: 'running',
        service: 'Railway Browser Proxy',
        version: '1.0.0',
        endpoints: {
            '/screenshot': 'GET - Take screenshot of URL',
            '/fetch': 'GET - Fetch page content',
            '/search': 'GET - Search Google/Bing'
        }
    });
});

// Screenshot endpoint
app.get('/screenshot', async (req, res) => {
    const { url, width = 1920, height = 1080 } = req.query;
    
    if (!url) {
        return res.status(400).json({ error: 'URL parameter required' });
    }
    
    let browser = null;
    try {
        console.log(`📸 Screenshot: ${url}`);
        
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: parseInt(width), height: parseInt(height) });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        
        const screenshot = await page.screenshot({ 
            encoding: 'base64',
            fullPage: false
        });
        
        const title = await page.title();
        
        res.json({
            success: true,
            title: title,
            screenshot: `data:image/png;base64,${screenshot}`,
            url: url
        });
        
    } catch (error) {
        console.error('Screenshot error:', error.message);
        res.status(500).json({ error: error.message });
    } finally {
        if (browser) await browser.close();
    }
});

// Fetch page content
app.get('/fetch', async (req, res) => {
    const { url } = req.query;
    
    if (!url) {
        return res.status(400).json({ error: 'URL parameter required' });
    }
    
    let browser = null;
    try {
        console.log(` fetch: ${url}`);
        
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });
        
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        
        const content = await page.evaluate(() => document.body.innerText);
        const title = await page.title();
        const html = await page.content();
        
        res.json({
            success: true,
            title: title,
            content: content,
            html: html,
            url: url
        });
        
    } catch (error) {
        console.error('Fetch error:', error.message);
        res.status(500).json({ error: error.message });
    } finally {
        if (browser) await browser.close();
    }
});

// Search endpoint
app.get('/search', async (req, res) => {
    const { q, engine = 'google' } = req.query;
    
    if (!q) {
        return res.status(400).json({ error: 'q (query) parameter required' });
    }
    
    let browser = null;
    try {
        console.log(`🔍 Search: ${q} on ${engine}`);
        
        const searchUrl = engine === 'bing' 
            ? `https://www.bing.com/search?q=${encodeURIComponent(q)}`
            : `https://www.google.com/search?q=${encodeURIComponent(q)}`;
        
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // Extract search results
        const results = await page.evaluate(() => {
            const items = [];
            document.querySelectorAll('h3').forEach(h3 => {
                const link = h3.closest('a');
                if (link) {
                    items.push({
                        title: h3.textContent.trim(),
                        url: link.href
                    });
                }
            });
            return items;
        });
        
        // Take screenshot
        const screenshot = await page.screenshot({ 
            encoding: 'base64',
            fullPage: false
        });
        
        res.json({
            success: true,
            query: q,
            engine: engine,
            results: results.slice(0, 10),
            screenshot: `data:image/png;base64,${screenshot}`,
            url: searchUrl
        });
        
    } catch (error) {
        console.error('Search error:', error.message);
        res.status(500).json({ error: error.message });
    } finally {
        if (browser) await browser.close();
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Railway Browser Proxy running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/`);
});
