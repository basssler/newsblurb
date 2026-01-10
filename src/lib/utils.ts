/**
 * Wait for a random amount of time between min and max seconds
 * @param minSeconds Minimum wait time in seconds
 * @param maxSeconds Maximum wait time in seconds
 */
export async function waitRandom(minSeconds: number, maxSeconds: number): Promise<void> {
    const minMs = minSeconds * 1000;
    const maxMs = maxSeconds * 1000;
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;

    console.log(`[WAIT] Waiting for ${delay}ms...`);
    return new Promise(resolve => setTimeout(resolve, delay));
}
