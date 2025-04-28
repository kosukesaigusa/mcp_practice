import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";
import { createInterface } from "readline/promises";

dotenv.config();

class Host {
  constructor() {
    this.client = new Client({
      name: "example-client",
      version: "1.0.0"
    });

    this.anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    this.transport = new StdioClientTransport({
      command: "node",
      args: ["src/server.js"]
    });
  }

  async connect() {
    await this.client.connect(this.transport);
  }

  async processQuery(query) {
    // 利用可能なツールを取得
    const tools = await this.client.listTools();
    const availableTools = tools.tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema
    }));

    // Claude にクエリを送信
    const response = await this.anthropicClient.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: query
      }],
      tools: availableTools
    });

    const finalText = [];
    const messages = [{
      role: "user",
      content: query
    }];

    for (const content of response.content) {
      if (content.type === "text") {
        finalText.push(content.text);
      } else if (content.type === "tool_use") {
        // ツール呼び出し
        const result = await this.client.callTool({
          name: content.name,
          arguments: content.input
        });

        finalText.push(`[ツール ${content.name} を呼び出し: ${JSON.stringify(content.input)}]`);
        finalText.push(result.content[0].text);

        // ツールの結果を Claude に送信
        const followUpResponse = await this.anthropicClient.messages.create({
          model: "claude-3-opus-20240229",
          max_tokens: 1000,
          messages: [
            ...messages,
            {
              role: "assistant",
              content: response.content
            },
            {
              role: "user",
              content: [{
                type: "tool_result",
                tool_use_id: content.id,
                content: result.content[0].text
              }]
            }
          ],
          tools: availableTools
        });

        finalText.push(followUpResponse.content[0].text);
      }
    }

    return finalText.join("\n");
  }

  async close() {
    await this.client.close();
  }
}

// 使用例
async function main() {
  const host = new Host();
  await host.connect();

  console.log("MCP ホストが起動しました！");
  console.log("自然言語でクエリを入力してください（終了するには 'exit' と入力）");

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  while (true) {
    const query = await rl.question("> ");
    if (query.toLowerCase() === "exit") break;

    try {
      const result = await host.processQuery(query);
      console.log(result);
    } catch (error) {
      console.error("エラーが発生しました:", error);
    }
  }

  rl.close();
  await host.close();
}

main().catch(console.error); 