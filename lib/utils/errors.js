export class ScraperError extends Error {
    constructor(message, category = 'unknown', url = null) {
        super(message);
        this.name = 'ScraperError';
        this.category = category;
        this.url = url;
        this.timestamp = new Date().toISOString();
    }
}
