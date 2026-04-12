import type { CloudAdapter } from './cloudAdapter.js';
import type { ComputeTarget } from '../types/plan.js';

export async function getCloudAdapter(target: ComputeTarget): Promise<CloudAdapter> {
  switch (target.type) {
    case 'local': {
      const { LocalGPUAdapter } = await import('./localGPU.js');
      const adapter = new LocalGPUAdapter();
      await adapter.connect(target);
      return adapter;
    }
    case 'aws': {
      const { AWSSageMakerAdapter } = await import('./awsSageMaker.js');
      const adapter = new AWSSageMakerAdapter();
      await adapter.connect(target);
      return adapter;
    }
    case 'gcp': {
      const { GCPVertexAIAdapter } = await import('./gcpVertexAI.js');
      const adapter = new GCPVertexAIAdapter();
      await adapter.connect(target);
      return adapter;
    }
    case 'azure': {
      const { AzureMLAdapter } = await import('./azureML.js');
      const adapter = new AzureMLAdapter();
      await adapter.connect(target);
      return adapter;
    }
    case 'ssh': {
      const { SSHClusterAdapter } = await import('./sshCluster.js');
      const adapter = new SSHClusterAdapter();
      await adapter.connect(target);
      return adapter;
    }
    default: {
      const { LocalGPUAdapter } = await import('./localGPU.js');
      return new LocalGPUAdapter();
    }
  }
}
