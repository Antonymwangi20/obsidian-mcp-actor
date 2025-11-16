export async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    let lastErr = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastErr = err;
            console.warn(`Attempt ${attempt}/${maxRetries} failed: ${err.message}`);
            if (attempt < maxRetries) {
                const exponential = baseDelay * Math.pow(2, attempt - 1);
                const jitter = (Math.random() - 0.5) * 0.6 * exponential;
                const delay = Math.max(exponential + jitter, baseDelay);
                console.log(`  Retrying in ${(delay / 1000).toFixed(2)}s...`);
                await new Promise(res => setTimeout(res, delay));
            }
        }
    }
    throw lastErr;
}
