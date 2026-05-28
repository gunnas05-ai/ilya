/**
 * OpenTelemetry Tracing — Development-mode basit yapilandirma
 * Production'da OTLP exporter ile tam entegre edilir.
 */
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317';
const serviceName = process.env.OTEL_SERVICE_NAME || 'kaptan-backend';

let sdk: any = null;

export async function startTracing(): Promise<void> {
  try {
    const { NodeSDK } = await import('@opentelemetry/sdk-node');
    const { getNodeAutoInstrumentations } = await import('@opentelemetry/auto-instrumentations-node');

    sdk = new NodeSDK({
      instrumentations: [
        getNodeAutoInstrumentations(),
      ],
    });

    await sdk.start();
    console.log(`[OpenTelemetry] Tracing baslatildi — servis: ${serviceName}`);
  } catch (err: any) {
    console.warn(`[OpenTelemetry] Tracing baslatilamadi: ${err.message}`);
  }
}

export async function stopTracing(): Promise<void> {
  try {
    if (sdk) {
      await sdk.shutdown();
      console.log('[OpenTelemetry] Tracing durduruldu');
    }
  } catch {
    // ignore
  }
}

process.on('SIGTERM', () => {
  stopTracing().finally(() => process.exit(0));
});

process.on('SIGINT', () => {
  stopTracing().finally(() => process.exit(0));
});
