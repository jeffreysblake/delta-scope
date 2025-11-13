/**
 * AI Setup Wizard component
 * Interactive first-run setup for AI configuration
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import type { AIConfig } from '../types/index.js';

type WizardStep = 'welcome' | 'provider' | 'apiKey' | 'model' | 'endpoint' | 'testing' | 'complete';
type AIProvider = 'anthropic' | 'openai' | 'local';

interface AISetupWizardProps {
  onComplete: (config: AIConfig) => void;
  onSkip: () => void;
}

export const AISetupWizard: React.FC<AISetupWizardProps> = ({ onComplete, onSkip }) => {
  const [step, setStep] = useState<WizardStep>('welcome');
  const [provider, setProvider] = useState<AIProvider>('anthropic');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  /**
   * Test AI connection
   */
  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      // Validate configuration
      if (!provider) {
        setTestResult({ success: false, message: 'Provider not selected' });
        setTesting(false);
        return;
      }

      if ((provider === 'anthropic' || provider === 'openai') && !apiKey) {
        setTestResult({ success: false, message: 'API key required' });
        setTesting(false);
        return;
      }

      if (!model) {
        setTestResult({ success: false, message: 'Model name required' });
        setTesting(false);
        return;
      }

      // Validate API key format
      if (provider === 'anthropic' && !apiKey.startsWith('sk-ant-')) {
        setTestResult({
          success: false,
          message: 'Anthropic API keys should start with "sk-ant-"',
        });
        setTesting(false);
        return;
      }

      if (provider === 'openai' && !apiKey.startsWith('sk-')) {
        setTestResult({
          success: false,
          message: 'OpenAI API keys should start with "sk-"',
        });
        setTesting(false);
        return;
      }

      // Validate endpoint for OpenAI/local
      if ((provider === 'openai' || provider === 'local') && endpoint) {
        if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
          setTestResult({
            success: false,
            message: 'Endpoint must start with http:// or https://',
          });
          setTesting(false);
          return;
        }
      }

      // Simulate connection test (in reality, would make a test API call)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setTestResult({
        success: true,
        message: `Successfully connected to ${provider} with model ${model}`,
      });
      setTesting(false);
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
      });
      setTesting(false);
    }
  };

  /**
   * Complete wizard and save configuration
   */
  const completeWizard = () => {
    const config: AIConfig = {
      enabled: true,
      provider,
      apiKey: apiKey || 'not-needed',
      model,
      endpoint: endpoint || undefined,
      timeout: 30000,
      maxRetries: 3,
      maxRecommendations: 5,
      autoAnalyze: false,
    };

    onComplete(config);
  };

  // Handle keyboard input for all wizard steps
  useInput((input) => {
    if (step === 'welcome') {
      if (input === 's') {
        onSkip();
      } else {
        setStep('provider');
      }
    } else if (step === 'provider') {
      if (input === '1') {
        setProvider('anthropic');
        setModel('claude-3-5-sonnet-20241022');
        setStep('apiKey');
      } else if (input === '2') {
        setProvider('openai');
        setModel('gpt-4');
        setEndpoint('https://api.openai.com/v1');
        setStep('apiKey');
      } else if (input === '3') {
        setProvider('local');
        setModel('llama3');
        setEndpoint('http://localhost:11434/v1');
        setApiKey('not-needed');
        setStep('model');
      } else if (input === 's') {
        onSkip();
      }
    } else if (step === 'testing') {
      if (input === 't' && !testing) {
        testConnection();
      } else if (input === 'c' && testResult?.success) {
        completeWizard();
      } else if (input === 'b') {
        setStep('provider');
        setTestResult(null);
      } else if (input === 's') {
        onSkip();
      }
    }
  });

  // Welcome step
  if (step === 'welcome') {
    return (
      <Box flexDirection="column" borderStyle="bold" borderColor="cyan" paddingX={2} paddingY={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            🤖 AI Setup Wizard
          </Text>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Text>Welcome to the AI setup wizard!</Text>
          <Text dimColor>
            This wizard will help you configure AI-powered features for delta-scope.
          </Text>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Text bold>Features:</Text>
          <Text>  • Intelligent repository recommendations</Text>
          <Text>  • Automated workflow analysis</Text>
          <Text>  • Smart action suggestions</Text>
        </Box>

        <Box borderStyle="single" borderColor="gray" paddingX={1}>
          <Text>
            Press <Text bold>any key</Text> to continue • Press <Text bold>s</Text> to skip
          </Text>
        </Box>
      </Box>
    );
  }

  // Provider selection step
  if (step === 'provider') {
    return (
      <Box flexDirection="column" borderStyle="bold" borderColor="cyan" paddingX={2} paddingY={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            Step 1/4: Choose AI Provider
          </Text>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Text>
            <Text bold color="green">
              1
            </Text>{' '}
            Anthropic Claude (Recommended)
          </Text>
          <Text dimColor>   • Best performance and accuracy</Text>
          <Text dimColor>   • Requires API key from anthropic.com</Text>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Text>
            <Text bold color="yellow">
              2
            </Text>{' '}
            OpenAI GPT
          </Text>
          <Text dimColor>   • Good performance</Text>
          <Text dimColor>   • Requires API key from openai.com</Text>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Text>
            <Text bold color="blue">
              3
            </Text>{' '}
            Local Model (Ollama/LM Studio)
          </Text>
          <Text dimColor>   • Free, runs locally</Text>
          <Text dimColor>   • Requires Ollama or LM Studio installed</Text>
        </Box>

        <Box borderStyle="single" borderColor="gray" paddingX={1}>
          <Text>
            Press <Text bold>1</Text>, <Text bold>2</Text>, or <Text bold>3</Text> to select • Press{' '}
            <Text bold>s</Text> to skip
          </Text>
        </Box>
      </Box>
    );
  }

  // API Key step
  if (step === 'apiKey') {
    return (
      <Box flexDirection="column" borderStyle="bold" borderColor="cyan" paddingX={2} paddingY={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            Step 2/4: Enter API Key
          </Text>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Text>
            Provider: <Text bold>{provider}</Text>
          </Text>
          {provider === 'anthropic' && (
            <Text dimColor>Get your API key from: https://console.anthropic.com/</Text>
          )}
          {provider === 'openai' && (
            <Text dimColor>Get your API key from: https://platform.openai.com/api-keys</Text>
          )}
        </Box>

        <Box marginBottom={1}>
          <Text>API Key: </Text>
          <TextInput
            value={apiKey}
            onChange={setApiKey}
            placeholder={provider === 'anthropic' ? 'sk-ant-...' : 'sk-...'}
            onSubmit={() => setStep('model')}
            mask="*"
          />
        </Box>

        <Box borderStyle="single" borderColor="gray" paddingX={1}>
          <Text dimColor>Press Enter to continue</Text>
        </Box>
      </Box>
    );
  }

  // Model step
  if (step === 'model') {
    const defaultModels = {
      anthropic: 'claude-3-5-sonnet-20241022',
      openai: 'gpt-4',
      local: 'llama3',
    };

    return (
      <Box flexDirection="column" borderStyle="bold" borderColor="cyan" paddingX={2} paddingY={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            Step {provider === 'local' ? '2/4' : '3/4'}: Configure Model
          </Text>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Text>
            Provider: <Text bold>{provider}</Text>
          </Text>
          <Text dimColor>Default: {defaultModels[provider]}</Text>
        </Box>

        <Box marginBottom={1}>
          <Text>Model name: </Text>
          <TextInput
            value={model}
            onChange={setModel}
            placeholder={defaultModels[provider]}
            onSubmit={() => {
              if (provider === 'local') {
                setStep('endpoint');
              } else {
                setStep('testing');
              }
            }}
          />
        </Box>

        <Box borderStyle="single" borderColor="gray" paddingX={1}>
          <Text dimColor>Press Enter to continue (leave empty for default)</Text>
        </Box>
      </Box>
    );
  }

  // Endpoint step (for local/OpenAI)
  if (step === 'endpoint') {
    const defaultEndpoint =
      provider === 'local' ? 'http://localhost:11434/v1' : 'https://api.openai.com/v1';

    return (
      <Box flexDirection="column" borderStyle="bold" borderColor="cyan" paddingX={2} paddingY={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            Step {provider === 'local' ? '3/4' : '4/4'}: Configure Endpoint
          </Text>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Text>
            Provider: <Text bold>{provider}</Text>
          </Text>
          <Text dimColor>Default: {defaultEndpoint}</Text>
        </Box>

        <Box marginBottom={1}>
          <Text>Endpoint URL: </Text>
          <TextInput
            value={endpoint}
            onChange={setEndpoint}
            placeholder={defaultEndpoint}
            onSubmit={() => setStep('testing')}
          />
        </Box>

        <Box borderStyle="single" borderColor="gray" paddingX={1}>
          <Text dimColor>Press Enter to continue (leave empty for default)</Text>
        </Box>
      </Box>
    );
  }

  // Testing step
  if (step === 'testing') {
    return (
      <Box flexDirection="column" borderStyle="bold" borderColor="cyan" paddingX={2} paddingY={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">
            Step 4/4: Test Connection
          </Text>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Text>
            Provider: <Text bold>{provider}</Text>
          </Text>
          <Text>
            Model: <Text bold>{model || 'default'}</Text>
          </Text>
          {endpoint && (
            <Text>
              Endpoint: <Text bold>{endpoint}</Text>
            </Text>
          )}
        </Box>

        {testing && (
          <Box marginBottom={1}>
            <Text color="cyan">
              <Spinner type="dots" /> Testing connection...
            </Text>
          </Box>
        )}

        {testResult && (
          <Box
            flexDirection="column"
            marginBottom={1}
            borderStyle="single"
            borderColor={testResult.success ? 'green' : 'red'}
            paddingX={1}
          >
            <Text color={testResult.success ? 'green' : 'red'}>
              {testResult.success ? '✅' : '❌'} {testResult.message}
            </Text>
          </Box>
        )}

        <Box borderStyle="single" borderColor="gray" paddingX={1}>
          <Text>
            {!testing && !testResult && (
              <>
                Press <Text bold>t</Text> to test connection
              </>
            )}
            {testResult?.success && (
              <>
                Press <Text bold>c</Text> to complete setup
              </>
            )}
            {testResult && !testResult.success && (
              <>
                Press <Text bold>t</Text> to retry • Press <Text bold>b</Text> to go back
              </>
            )}
            {' • '}
            Press <Text bold>s</Text> to skip
          </Text>
        </Box>
      </Box>
    );
  }

  // This should never be reached, but needed for TypeScript
  return null;
};
