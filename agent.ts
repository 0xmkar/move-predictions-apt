import { z } from "zod";
import { ChatOllama } from "@langchain/ollama";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";

import {
  deployNewSafe,
  deployNewSafeMetadata,
  getEthBalance,
  getEthBalanceMetadata,
  sendRandomTnx,
  sendRandomTnxMetadata,
  calculateUSDCdistribution,
  calculateUSDCdistributionMetadata
} from "./tools/safe";
import { getEthPriceUsd, getEthPriceUsdMetadata } from "./tools/prices";
import { multiply, multiplyMetadata } from "./tools/math";

// Define the tools for the agent to use
const agentTools = [
  tool(calculateUSDCdistribution, calculateUSDCdistributionMetadata),
  tool(sendRandomTnx, sendRandomTnxMetadata),
  tool(getEthBalance, getEthBalanceMetadata),
  tool(getEthPriceUsd, getEthPriceUsdMetadata),  
  tool(multiply, multiplyMetadata),
  tool(deployNewSafe, deployNewSafeMetadata),
];

const agentModel = new ChatOllama({ model: "mistral-nemo" });
const agentCheckpointer = new MemorySaver();

export const agent = createReactAgent({
  llm: agentModel,
  tools: agentTools,
  checkpointSaver: agentCheckpointer,
  prompt: "Use ONLY the tools provided. NEVER respond with instructions. Return valid JSON with tool calls.",
  responseFormat: z.object({
    tool_used: z.string(),
    result: z.string(),
  }),
});
