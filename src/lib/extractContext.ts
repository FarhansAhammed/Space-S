// lib/extractContext.ts
// Extracts a context fingerprint from node content.
// Tries heuristic first. Falls back to LLM if heuristic confidence is low.

const DOMAIN_SIGNALS: Record<string, string[]> = {
  "Computer Networking": ["OSI", "TCP/IP", "layer", "protocol", "packet",
    "bandwidth", "latency", "router", "switch", "subnet", "IP address",
    "MAC address", "ethernet", "HTTP", "DNS"],
  "Machine Learning": ["model", "training", "neural network", "dataset",
    "epoch", "gradient", "loss function", "inference", "embedding",
    "transformer", "parameter", "weight"],
  "Biology": ["cell", "DNA", "RNA", "protein", "organism", "gene",
    "chromosome", "metabolism", "enzyme", "nucleus", "mitosis"],
  "Philosophy": ["consciousness", "ethics", "epistemology", "ontology",
    "Kant", "Plato", "Aristotle", "phenomenology", "logic", "a priori"],
  "Finance": ["equity", "bond", "derivative", "portfolio", "hedge",
    "yield", "dividend", "capital", "liquidity", "leverage", "arbitrage"],
  "Physics": ["quantum", "relativity", "photon", "electron", "force",
    "momentum", "entropy", "wavelength", "particle", "field", "mass"],
  "Chemistry": ["molecule", "atom", "compound", "reaction", "element",
    "bond", "valence", "oxidation", "catalyst", "polymer", "ion"],
  "Law": ["statute", "liability", "jurisdiction", "plaintiff", "defendant",
    "contract", "tort", "precedent", "constitution", "amendment"],
  "Medicine": ["diagnosis", "symptom", "treatment", "pathology", "clinical",
    "therapy", "dosage", "prognosis", "anatomy", "pharmacology"],
  "Economics": ["supply", "demand", "inflation", "GDP", "monetary policy",
    "fiscal", "market", "elasticity", "utility", "aggregate"],
};

export async function extractContextSummary(
  nodeContent: string,
  nodeTitle: string,
  token?: string | null,
  model?: string
): Promise<string> {
  const content = nodeContent || '';
  const title = nodeTitle || '';
  
  // Heuristic approach (no API call, instant):
  if (content.length >= 80) {
    // 1. Take the first 400 characters of nodeContent.
    let snippet = content.slice(0, 400);

    // 2. Strip markdown, bullet points, and formatting.
    snippet = snippet
      .replace(/[*#_`\[\]()]/g, '') // strip md formatting chars
      .replace(/^[ \t-*+>]*\d*\.?\s*/gm, '') // strip list prefixes, blockquotes
      .replace(/\s+/g, ' ') // normalize spaces
      .trim();

    // 3. Extract the first sentence as the "topic sentence."
    const sentences = snippet.split(/(?<=[.!?])\s+/);
    let firstSentence = sentences[0] || '';
    if (firstSentence && !firstSentence.endsWith('.')) {
      firstSentence += '.';
    }

    // 4. Look for domain signals
    const contentLower = content.toLowerCase();
    let bestDomain = '';
    let bestScore = 0;
    const detectedEntities: string[] = [];

    for (const [domain, signals] of Object.entries(DOMAIN_SIGNALS)) {
      let score = 0;
      const matchedSignals: string[] = [];
      for (const signal of signals) {
        if (contentLower.includes(signal.toLowerCase())) {
          score++;
          matchedSignals.push(signal);
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestDomain = domain;
        detectedEntities.length = 0;
        detectedEntities.push(...matchedSignals);
      }
    }

    // 5. Score minimum of 2 to qualify
    if (bestScore >= 2 && bestDomain && firstSentence.length > 10) {
      const topEntities = detectedEntities.slice(0, 5).join(', ');
      return `${bestDomain}: ${firstSentence}${topEntities ? ` Key entities: ${topEntities}.` : ''}`;
    }
  }

  // Fall back to LLM extraction call via POST /api/extract-context
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch('/api/extract-context', {
      method: 'POST',
      headers,
      body: JSON.stringify({ content: content.slice(0, 600), title, model }),
    });


    if (!response.ok) {
      throw new Error(`Context extraction API status ${response.status}`);
    }

    const data = await response.json();
    if (data.contextSummary) {
      return data.contextSummary;
    }
  } catch (error) {
    console.error('Failed to extract context via API:', error);
  }

  // Safe fallback if both fail
  return `General context: ${title}.`;
}
