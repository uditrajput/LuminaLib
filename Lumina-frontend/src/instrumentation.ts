export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { createLogger, transports, format } = await import('winston');
        const LokiTransport = (await import('winston-loki')).default;

        if (!process.env.LOKI_URL) return;

        const logger = createLogger({
            format: format.combine(
                format.timestamp(),
                format.json()
            ),
            transports: [
                new LokiTransport({
                    host: process.env.LOKI_URL,
                    labels: { application: 'luminalib-frontend' },
                    json: true,
                    replaceTimestamp: true,
                    batching: false,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onConnectionError: (err: any) => console.error(err)
                })
            ]
        });

        logger.info("Next.js Frontend Server Intialized and Loki Transport Active");

        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        console.log = (...args: any[]) => {
            originalLog(...args);
            logger.info({ message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ') });
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        console.error = (...args: any[]) => {
            originalError(...args);
            logger.error({ message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ') });
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        console.warn = (...args: any[]) => {
            originalWarn(...args);
            logger.warn({ message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ') });
        };
    }
}
