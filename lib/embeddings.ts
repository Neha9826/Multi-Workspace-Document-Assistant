import {
  env,
  pipeline,
  type FeatureExtractionPipeline,
} from "@huggingface/transformers";

const EMBEDDING_MODEL =
  "onnx-community/all-MiniLM-L6-v2-ONNX";

const EMBEDDING_DIMENSIONS = 384;

/*
 * Force Transformers.js to use WASM instead of the
 * native Node ONNX runtime.
 *
 * This avoids requiring `onnxruntime-node` in Vercel.
 */
env.allowLocalModels = false;
env.useBrowserCache = false;

let extractorPromise:
  | Promise<FeatureExtractionPipeline>
  | null = null;

async function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractorPromise) {
    console.log("========================================");
    console.log("Loading embedding model...");
    console.log(`Model: ${EMBEDDING_MODEL}`);
    console.log("Runtime: WASM");
    console.log("========================================");

    extractorPromise = pipeline(
      "feature-extraction",
      EMBEDDING_MODEL,
      {
        device: "cpu",

        progress_callback: (info) => {
          if (info.status === "progress") {
            const progress =
              typeof info.progress === "number"
                ? info.progress.toFixed(1)
                : "0.0";

            console.log(
              `[Embedding model] ${
                info.file ?? "model"
              }: ${progress}%`,
            );

            return;
          }

          if (info.status === "done") {
            console.log(
              `[Embedding model] Finished: ${
                info.file ?? "model"
              }`,
            );
          }
        },
      },
    );

    extractorPromise
      .then(() => {
        console.log("========================================");
        console.log("Embedding model ready.");
        console.log("========================================");
      })
      .catch((error) => {
        console.error(
          "Failed to load embedding model:",
          error,
        );

        extractorPromise = null;
      });
  }

  return extractorPromise;
}

export async function generateEmbeddings(
  texts: string[],
): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const extractor = await getExtractor();

  console.log(
    `[Embeddings] Generating ${texts.length} embeddings...`,
  );

  const output = await extractor(texts, {
    pooling: "mean",
    normalize: true,
  });

  const values = Array.from(
    output.data as Float32Array,
  );

  const expectedLength =
    texts.length * EMBEDDING_DIMENSIONS;

  if (values.length !== expectedLength) {
    throw new Error(
      `Unexpected embedding dimensions. Expected ${expectedLength} values but received ${values.length}.`,
    );
  }

  const embeddings: number[][] = [];

  for (
    let index = 0;
    index < texts.length;
    index += 1
  ) {
    const start =
      index * EMBEDDING_DIMENSIONS;

    const end =
      start + EMBEDDING_DIMENSIONS;

    embeddings.push(
      values.slice(start, end),
    );
  }

  console.log(
    `[Embeddings] Successfully generated ${embeddings.length} embeddings.`,
  );

  return embeddings;
}

export async function generateEmbedding(
  text: string,
): Promise<number[]> {
  const embeddings =
    await generateEmbeddings([text]);

  const embedding = embeddings[0];

  if (!embedding) {
    throw new Error(
      "Failed to generate embedding.",
    );
  }

  return embedding;
}