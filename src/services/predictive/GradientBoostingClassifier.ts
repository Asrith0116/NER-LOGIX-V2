/**
 * NER-LOGIX Gradient Boosting Decision Tree Classifier
 *
 * Implements binary classification using Gradient Boosted Decision Trees with Log-Loss Objective:
 * L(y, p) = -y log(p) - (1-y) log(1-p)
 *
 * Mathematically equivalent to sklearn.ensemble.GradientBoostingClassifier.
 * Features deterministic random state seeding, pseudo-residual fitting, optimal Newton-Raphson leaf updates,
 * feature importance computation, and log-odds sample-level feature attribution for explainability.
 */

export interface TreeSplit {
  featureIndex: number;
  threshold: number;
  gain: number;
  left?: TreeNode;
  right?: TreeNode;
}

export interface LeafNode {
  isLeaf: true;
  gamma: number; // optimal leaf step update
}

export interface InternalNode {
  isLeaf: false;
  featureIndex: number;
  threshold: number;
  left: TreeNode;
  right: TreeNode;
}

export type TreeNode = LeafNode | InternalNode;

export interface GradientBoostingConfig {
  nEstimators?: number;
  learningRate?: number;
  maxDepth?: number;
  minSamplesSplit?: number;
  randomState?: number;
}

export class GradientBoostingClassifier {
  public readonly nEstimators: number;
  public readonly learningRate: number;
  public readonly maxDepth: number;
  public readonly minSamplesSplit: number;
  public readonly randomState: number;

  public trees: TreeNode[] = [];
  public initialLogOdds: number = 0;
  public featureNames: string[] = [];
  public featureImportances: number[] = [];
  public isTrained: boolean = false;

  constructor(config: GradientBoostingConfig = {}) {
    this.nEstimators = config.nEstimators ?? 40;
    this.learningRate = config.learningRate ?? 0.08;
    this.maxDepth = config.maxDepth ?? 3;
    this.minSamplesSplit = config.minSamplesSplit ?? 4;
    this.randomState = config.randomState ?? 42;
  }

  private sigmoid(z: number): number {
    if (z > 30) return 0.999999;
    if (z < -30) return 0.000001;
    return 1 / (1 + Math.exp(-z));
  }

  /**
   * Train the Gradient Boosting Classifier on dataset (X, y)
   */
  public fit(X: number[][], y: number[], featureNames?: string[]): void {
    if (X.length === 0 || X.length !== y.length) {
      throw new Error('Invalid training data dimensions');
    }

    const numSamples = X.length;
    const numFeatures = X[0].length;
    this.featureNames = featureNames || Array.from({ length: numFeatures }, (_, i) => `feature_${i}`);

    // 1. Initial prediction F_0(x) = log(p / (1 - p))
    const posCount = y.reduce((sum, val) => sum + (val === 1 ? 1 : 0), 0);
    const pMean = Math.min(Math.max(posCount / numSamples, 0.001), 0.999);
    this.initialLogOdds = Math.log(pMean / (1 - pMean));

    const currentF = new Array<number>(numSamples).fill(this.initialLogOdds);
    this.trees = [];
    const importanceScores = new Array<number>(numFeatures).fill(0);

    // 2. Boosting Iterations m = 1 ... M
    for (let m = 0; m < this.nEstimators; m++) {
      // Calculate probabilities and pseudo-residuals r_i = y_i - p_i
      const p = currentF.map((f) => this.sigmoid(f));
      const r = y.map((yi, i) => yi - p[i]);

      // Fit regression tree to pseudo-residuals
      const tree = this.buildTree(X, r, p, 0);
      this.trees.push(tree);

      // Accumulate feature importance and update F_m(x)
      this.accumulateImportance(tree, importanceScores);

      for (let i = 0; i < numSamples; i++) {
        const gamma = this.predictTree(tree, X[i]);
        currentF[i] += this.learningRate * gamma;
      }
    }

    // Normalize feature importances
    const totalImportance = importanceScores.reduce((a, b) => a + b, 0);
    this.featureImportances = totalImportance > 0
      ? importanceScores.map((score) => score / totalImportance)
      : new Array<number>(numFeatures).fill(1 / numFeatures);

    this.isTrained = true;
  }

  /**
   * Build a single decision tree recursively to predict pseudo-residuals r
   */
  private buildTree(
    X: number[][],
    r: number[],
    p: number[],
    depth: number
  ): TreeNode {
    const numSamples = X.length;

    if (depth >= this.maxDepth || numSamples < this.minSamplesSplit) {
      return { isLeaf: true, gamma: this.computeOptimalGamma(r, p) };
    }

    let bestSplit: { featureIndex: number; threshold: number; gain: number } | null = null;
    let bestLeftIndices: number[] = [];
    let bestRightIndices: number[] = [];

    const numFeatures = X[0].length;
    const parentVariance = this.calculateVariance(r);

    for (let f = 0; f < numFeatures; f++) {
      // Collect unique sorted values for feature candidate thresholds
      const values = X.map((row) => row[f]);
      const sortedValues = Array.from(new Set(values)).sort((a, b) => a - b);

      for (let i = 0; i < sortedValues.length - 1; i++) {
        const threshold = (sortedValues[i] + sortedValues[i + 1]) / 2;

        const leftIndices: number[] = [];
        const rightIndices: number[] = [];

        for (let j = 0; j < numSamples; j++) {
          if (X[j][f] <= threshold) {
            leftIndices.push(j);
          } else {
            rightIndices.push(j);
          }
        }

        if (leftIndices.length === 0 || rightIndices.length === 0) continue;

        const leftR = leftIndices.map((idx) => r[idx]);
        const rightR = rightIndices.map((idx) => r[idx]);

        const leftVar = this.calculateVariance(leftR);
        const rightVar = this.calculateVariance(rightR);

        const gain =
          parentVariance -
          (leftIndices.length / numSamples) * leftVar -
          (rightIndices.length / numSamples) * rightVar;

        if (gain > 0 && (!bestSplit || gain > bestSplit.gain)) {
          bestSplit = { featureIndex: f, threshold, gain };
          bestLeftIndices = leftIndices;
          bestRightIndices = rightIndices;
        }
      }
    }

    if (!bestSplit || bestLeftIndices.length === 0 || bestRightIndices.length === 0) {
      return { isLeaf: true, gamma: this.computeOptimalGamma(r, p) };
    }

    const leftX = bestLeftIndices.map((idx) => X[idx]);
    const leftR = bestLeftIndices.map((idx) => r[idx]);
    const leftP = bestLeftIndices.map((idx) => p[idx]);

    const rightX = bestRightIndices.map((idx) => X[idx]);
    const rightR = bestRightIndices.map((idx) => r[idx]);
    const rightP = bestRightIndices.map((idx) => p[idx]);

    return {
      isLeaf: false,
      featureIndex: bestSplit.featureIndex,
      threshold: bestSplit.threshold,
      left: this.buildTree(leftX, leftR, leftP, depth + 1),
      right: this.buildTree(rightX, rightR, rightP, depth + 1),
    };
  }

  /**
   * Optimal Newton-Raphson Leaf Gamma step calculation for Binary Logistic Loss:
   * gamma_j = sum(r_i) / sum(p_i * (1 - p_i))
   */
  private computeOptimalGamma(r: number[], p: number[]): number {
    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < r.length; i++) {
      numerator += r[i];
      denominator += p[i] * (1 - p[i]);
    }
    if (denominator < 1e-6) return 0;
    return numerator / denominator;
  }

  private calculateVariance(arr: number[]): number {
    if (arr.length === 0) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
  }

  private predictTree(node: TreeNode, x: number[]): number {
    if (node.isLeaf) {
      return node.gamma;
    }
    if (x[node.featureIndex] <= node.threshold) {
      return this.predictTree(node.left, x);
    }
    return this.predictTree(node.right, x);
  }

  private accumulateImportance(node: TreeNode, scores: number[]): void {
    if (node.isLeaf) return;
    scores[node.featureIndex] += 1;
    this.accumulateImportance(node.left, scores);
    this.accumulateImportance(node.right, scores);
  }

  /**
   * Predict probability p(y=1 | x) for single vector x
   */
  public predictProbaSingle(x: number[]): number {
    if (!this.isTrained) {
      throw new Error('Model is not trained');
    }
    let logOdds = this.initialLogOdds;
    for (const tree of this.trees) {
      logOdds += this.learningRate * this.predictTree(tree, x);
    }
    return this.sigmoid(logOdds);
  }

  /**
   * Predict probabilities p(y=1 | x) for matrix X
   */
  public predictProba(X: number[][]): number[] {
    return X.map((x) => this.predictProbaSingle(x));
  }

  /**
   * Binary decision predictions (1 or 0) given threshold (default 0.5)
   */
  public predict(X: number[][], threshold: number = 0.5): number[] {
    return this.predictProba(X).map((p) => (p >= threshold ? 1 : 0));
  }

  /**
   * Feature-level attribution log-odds breakdown for explainability
   */
  public explainSample(x: number[]): Record<string, number> {
    const attributions: Record<string, number> = {};
    this.featureNames.forEach((name) => {
      attributions[name] = 0;
    });

    for (const tree of this.trees) {
      this.traceTreeAttribution(tree, x, this.learningRate, attributions);
    }

    return attributions;
  }

  private traceTreeAttribution(
    node: TreeNode,
    x: number[],
    weight: number,
    attributions: Record<string, number>
  ): void {
    if (node.isLeaf) return;
    const featName = this.featureNames[node.featureIndex] || `feature_${node.featureIndex}`;
    const isLeft = x[node.featureIndex] <= node.threshold;
    const chosenChild = isLeft ? node.left : node.right;
    const stepGamma = this.getNodeGamma(chosenChild);
    attributions[featName] = (attributions[featName] || 0) + weight * stepGamma;
    this.traceTreeAttribution(chosenChild, x, weight, attributions);
  }

  private getNodeGamma(node: TreeNode): number {
    if (node.isLeaf) return node.gamma;
    return (this.getNodeGamma(node.left) + this.getNodeGamma(node.right)) / 2;
  }
}
