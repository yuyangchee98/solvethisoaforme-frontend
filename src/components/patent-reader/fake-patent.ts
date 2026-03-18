export interface PatentClaim {
  number: number;
  text: string;
  dependsOn: number | null; // null = independent
  type: "independent" | "dependent";
}

export interface PatentSection {
  heading: string;
  paragraphs: string[];
}

export interface Patent {
  title: string;
  patentNumber: string;
  filingDate: string;
  publicationDate: string;
  inventors: string[];
  assignee: string;
  classification: string;
  abstract: string;
  claims: PatentClaim[];
  description: PatentSection[];
}

export const FAKE_PATENT: Patent = {
  title:
    "System and Method for Adaptive Neural Network Compression Using Entropy-Guided Pruning",
  patentNumber: "US 11,423,567 B2",
  filingDate: "March 14, 2022",
  publicationDate: "August 22, 2023",
  inventors: ["Alice Chen", "Robert Nakamura", "Priya Patel"],
  assignee: "DeepCompress Technologies, Inc.",
  classification: "G06N 3/08 (2023.01)",
  abstract:
    "A system and method for compressing deep neural networks by selectively pruning network parameters based on entropy analysis of activation distributions. The method includes computing layer-wise entropy scores for each neuron in a trained neural network, generating a pruning mask based on a target compression ratio and the computed entropy scores, and iteratively fine-tuning the pruned network to recover accuracy. The system further comprises a hardware-aware optimization module that adjusts the pruning strategy based on target deployment hardware constraints, enabling efficient inference on resource-constrained edge devices without significant accuracy degradation.",
  claims: [
    {
      number: 1,
      type: "independent",
      dependsOn: null,
      text: "A method for compressing a neural network, comprising: receiving a trained neural network having a plurality of layers, each layer comprising a plurality of neurons with associated weight parameters; computing, for each neuron in each layer, an entropy score based on an activation distribution of said neuron over a calibration dataset; generating a pruning mask for the neural network based on the computed entropy scores and a target compression ratio, wherein the pruning mask identifies neurons to be removed; applying the pruning mask to the trained neural network to produce a pruned neural network; and fine-tuning the pruned neural network using a subset of training data to recover accuracy lost during pruning.",
    },
    {
      number: 2,
      type: "dependent",
      dependsOn: 1,
      text: "The method of claim 1, wherein computing the entropy score comprises: collecting activation values for each neuron across a plurality of input samples from the calibration dataset; constructing a probability distribution from the collected activation values using kernel density estimation; and computing the Shannon entropy of the constructed probability distribution.",
    },
    {
      number: 3,
      type: "dependent",
      dependsOn: 2,
      text: "The method of claim 2, wherein the kernel density estimation uses a Gaussian kernel with a bandwidth selected by Silverman's rule of thumb.",
    },
    {
      number: 4,
      type: "dependent",
      dependsOn: 1,
      text: "The method of claim 1, wherein generating the pruning mask comprises: ranking the neurons across all layers by their computed entropy scores; selecting a threshold entropy score corresponding to the target compression ratio; and marking neurons with entropy scores below the threshold for removal.",
    },
    {
      number: 5,
      type: "dependent",
      dependsOn: 4,
      text: "The method of claim 4, further comprising applying a layer-wise minimum retention constraint that prevents any single layer from having more than a predetermined percentage of its neurons removed.",
    },
  ],
  description: [
    {
      heading: "TECHNICAL FIELD",
      paragraphs: [
        "The present disclosure relates generally to machine learning model optimization, and more particularly to methods and systems for compressing deep neural networks using entropy-guided pruning techniques to enable deployment on resource-constrained hardware.",
      ],
    },
    {
      heading: "BACKGROUND",
      paragraphs: [
        "Deep neural networks have demonstrated remarkable performance across a wide range of tasks including image classification, natural language processing, and speech recognition. However, state-of-the-art models often contain millions or billions of parameters, requiring substantial computational resources for inference.",
        "Model compression techniques, including pruning, quantization, and knowledge distillation, have been developed to reduce the size and computational requirements of neural networks. Among these, pruning methods remove redundant or less important parameters from the network. Existing pruning approaches typically rely on magnitude-based criteria, where weights with small absolute values are removed.",
        "However, magnitude-based pruning does not account for the information-theoretic significance of individual neurons. A neuron with small weights may still carry critical information for the network's decision-making process, while a neuron with large weights may be largely redundant. There remains a need for more principled approaches to neural network pruning that consider the actual information content of network components.",
      ],
    },
    {
      heading: "SUMMARY",
      paragraphs: [
        "The present disclosure provides a system and method for compressing neural networks using entropy-guided pruning. Unlike conventional magnitude-based approaches, the disclosed method evaluates the information content of each neuron by analyzing the entropy of its activation distribution over a representative calibration dataset.",
        "In one embodiment, the method comprises computing layer-wise entropy scores for each neuron, generating a pruning mask based on a target compression ratio, and iteratively fine-tuning the pruned network. The entropy scores provide a principled measure of each neuron's contribution to the network's representational capacity.",
      ],
    },
    {
      heading: "DETAILED DESCRIPTION",
      paragraphs: [
        "FIG. 1 illustrates an overview of the entropy-guided pruning system 100 according to one embodiment. The system 100 includes a trained neural network 110, a calibration module 120, an entropy computation module 130, a pruning engine 140, and a fine-tuning module 150.",
        "The calibration module 120 receives the trained neural network 110 and a calibration dataset 115. The calibration dataset 115 is a representative subset of the training data, typically comprising between 1% and 10% of the original training samples. The calibration module 120 performs forward passes through the network using the calibration dataset to collect activation statistics for each neuron.",
        "The entropy computation module 130 receives the collected activation statistics and computes an entropy score for each neuron. For a given neuron j in layer l, the entropy score H(a_j^l) is computed as the Shannon entropy of the probability distribution of activations. The probability distribution is estimated using kernel density estimation with a Gaussian kernel.",
        "The pruning engine 140 receives the computed entropy scores and a target compression ratio specified by the user. The pruning engine ranks all neurons across the network by their entropy scores and determines a threshold below which neurons are marked for removal. To prevent catastrophic degradation of any single layer, a layer-wise minimum retention constraint ensures that at least a specified percentage (e.g., 20%) of neurons in each layer are preserved.",
        "The fine-tuning module 150 takes the pruned network and performs iterative training using the original training data or a subset thereof. The fine-tuning process typically requires between 10% and 30% of the original training epochs to recover accuracy within an acceptable margin of the unpruned baseline.",
      ],
    },
  ],
};
