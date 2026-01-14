import Docker from 'dockerode';

class DockerAPI {
  constructor() {
    try {
      this.docker = new Docker({
        socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock'
      });
      this.available = true;
    } catch (error) {
      console.warn('Docker not available:', error.message);
      this.available = false;
    }
  }

  async listContainers(all = true) {
    if (!this.available) {
      throw new Error('Docker is not available');
    }
    return this.docker.listContainers({ all });
  }

  async getContainer(id) {
    if (!this.available) {
      throw new Error('Docker is not available');
    }
    const container = this.docker.getContainer(id);
    return container.inspect();
  }

  async startContainer(id) {
    if (!this.available) {
      throw new Error('Docker is not available');
    }
    const container = this.docker.getContainer(id);
    return container.start();
  }

  async stopContainer(id) {
    if (!this.available) {
      throw new Error('Docker is not available');
    }
    const container = this.docker.getContainer(id);
    return container.stop();
  }

  async restartContainer(id) {
    if (!this.available) {
      throw new Error('Docker is not available');
    }
    const container = this.docker.getContainer(id);
    return container.restart();
  }

  async removeContainer(id, force = false) {
    if (!this.available) {
      throw new Error('Docker is not available');
    }
    const container = this.docker.getContainer(id);
    return container.remove({ force });
  }

  async getContainerStats(id) {
    if (!this.available) {
      throw new Error('Docker is not available');
    }
    const container = this.docker.getContainer(id);
    return container.stats({ stream: false });
  }

  async getContainerLogs(id, tail = 100) {
    if (!this.available) {
      throw new Error('Docker is not available');
    }
    const container = this.docker.getContainer(id);
    return container.logs({
      stdout: true,
      stderr: true,
      tail,
      timestamps: true
    });
  }

  async listImages() {
    if (!this.available) {
      throw new Error('Docker is not available');
    }
    return this.docker.listImages();
  }

  async pullImage(imageName) {
    if (!this.available) {
      throw new Error('Docker is not available');
    }
    return new Promise((resolve, reject) => {
      this.docker.pull(imageName, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }
        
        this.docker.modem.followProgress(stream, (err, output) => {
          if (err) {
            reject(err);
          } else {
            resolve(output);
          }
        });
      });
    });
  }

  async createContainer(config) {
    if (!this.available) {
      throw new Error('Docker is not available');
    }

    // Parse ports (format: "8080:80,443:443")
    const portBindings = {};
    const exposedPorts = {};
    if (config.ports) {
      const ports = config.ports.split(',').map(p => p.trim()).filter(p => p);
      ports.forEach(portMapping => {
        const [hostPort, containerPort] = portMapping.split(':');
        if (hostPort && containerPort) {
          const port = `${containerPort}/tcp`;
          exposedPorts[port] = {};
          portBindings[port] = [{ HostPort: hostPort }];
        }
      });
    }

    // Parse volumes (format: "/host/path:/container/path")
    const binds = [];
    if (config.volumes) {
      const volumes = config.volumes.split('\n').map(v => v.trim()).filter(v => v);
      volumes.forEach(volume => {
        if (volume.includes(':')) {
          binds.push(volume);
        }
      });
    }

    // Parse environment variables (format: "KEY=VALUE")
    const env = [];
    if (config.env) {
      const envVars = config.env.split('\n').map(e => e.trim()).filter(e => e);
      envVars.forEach(envVar => {
        if (envVar.includes('=')) {
          env.push(envVar);
        }
      });
    }

    // Parse command
    const cmd = config.command ? config.command.split(' ').filter(c => c) : undefined;

    // Create container config
    const containerConfig = {
      Image: config.image,
      name: config.name,
      Env: env.length > 0 ? env : undefined,
      Cmd: cmd,
      ExposedPorts: Object.keys(exposedPorts).length > 0 ? exposedPorts : undefined,
      HostConfig: {
        PortBindings: Object.keys(portBindings).length > 0 ? portBindings : undefined,
        Binds: binds.length > 0 ? binds : undefined,
        RestartPolicy: {
          Name: config.restart || 'unless-stopped',
          MaximumRetryCount: 0
        }
      }
    };

    // Create and optionally start the container
    const container = await this.docker.createContainer(containerConfig);
    
    if (config.start !== false) {
      await container.start();
    }

    return container.inspect();
  }

  async getDockerInfo() {
    if (!this.available) {
      throw new Error('Docker is not available');
    }
    return this.docker.info();
  }

  async getDockerVersion() {
    if (!this.available) {
      throw new Error('Docker is not available');
    }
    return this.docker.version();
  }

  // Docker Stack/Compose management
  async createNetwork(name, driver = 'bridge') {
    if (!this.available) {
      throw new Error('Docker is not available');
    }
    return this.docker.createNetwork({
      Name: name,
      Driver: driver,
      Labels: {
        'com.docker.stack.namespace': name
      }
    });
  }

  async listNetworks() {
    if (!this.available) {
      throw new Error('Docker is not available');
    }
    return this.docker.listNetworks();
  }

  async removeNetwork(id) {
    if (!this.available) {
      throw new Error('Docker is not available');
    }
    const network = this.docker.getNetwork(id);
    return network.remove();
  }

  async createVolume(name, driver = 'local') {
    if (!this.available) {
      throw new Error('Docker is not available');
    }
    return this.docker.createVolume({
      Name: name,
      Driver: driver
    });
  }

  async listVolumes() {
    if (!this.available) {
      throw new Error('Docker is not available');
    }
    return this.docker.listVolumes();
  }

  async removeVolume(name) {
    if (!this.available) {
      throw new Error('Docker is not available');
    }
    const volume = this.docker.getVolume(name);
    return volume.remove();
  }

  async deployStack(stackConfig) {
    if (!this.available) {
      throw new Error('Docker is not available');
    }

    const { name, services, networks = {}, volumes = {} } = stackConfig;
    const createdResources = {
      networks: [],
      volumes: [],
      containers: []
    };

    try {
      // Create networks
      for (const [networkName, networkConfig] of Object.entries(networks)) {
        const fullNetworkName = `${name}_${networkName}`;
        try {
          const network = await this.createNetwork(
            fullNetworkName,
            networkConfig.driver || 'bridge'
          );
          createdResources.networks.push(network.id);
        } catch (error) {
          if (!error.message.includes('already exists')) {
            throw error;
          }
        }
      }

      // Create volumes
      for (const [volumeName, volumeConfig] of Object.entries(volumes)) {
        const fullVolumeName = `${name}_${volumeName}`;
        try {
          const volume = await this.createVolume(
            fullVolumeName,
            volumeConfig?.driver || 'local'
          );
          createdResources.volumes.push(volume.Name);
        } catch (error) {
          if (!error.message.includes('already exists')) {
            throw error;
          }
        }
      }

      // Create containers for each service
      for (const [serviceName, serviceConfig] of Object.entries(services)) {
        const containerName = `${name}_${serviceName}_1`;

        // Parse ports
        const portBindings = {};
        const exposedPorts = {};
        if (serviceConfig.ports) {
          serviceConfig.ports.forEach(portMapping => {
            const [hostPort, containerPort] = portMapping.split(':');
            if (hostPort && containerPort) {
              const port = `${containerPort}/tcp`;
              exposedPorts[port] = {};
              portBindings[port] = [{ HostPort: hostPort }];
            }
          });
        }

        // Parse volumes
        const binds = [];
        const volumesConfig = {};
        if (serviceConfig.volumes) {
          serviceConfig.volumes.forEach(volume => {
            if (volume.includes(':')) {
              const [source, target] = volume.split(':');
              // Check if it's a named volume or bind mount
              if (volumes[source]) {
                const fullVolumeName = `${name}_${source}`;
                binds.push(`${fullVolumeName}:${target}`);
              } else {
                binds.push(volume);
              }
            }
          });
        }

        // Parse networks
        const networksConfig = {};
        if (serviceConfig.networks) {
          serviceConfig.networks.forEach(networkName => {
            const fullNetworkName = `${name}_${networkName}`;
            networksConfig[fullNetworkName] = {};
          });
        }

        // Environment variables
        const env = [];
        if (serviceConfig.environment) {
          if (Array.isArray(serviceConfig.environment)) {
            env.push(...serviceConfig.environment);
          } else {
            for (const [key, value] of Object.entries(serviceConfig.environment)) {
              env.push(`${key}=${value}`);
            }
          }
        }

        // Pull image if needed
        try {
          await this.pullImage(serviceConfig.image);
        } catch (error) {
          console.warn(`Failed to pull image ${serviceConfig.image}:`, error.message);
        }

        // Create container
        const containerConfig = {
          Image: serviceConfig.image,
          name: containerName,
          Env: env.length > 0 ? env : undefined,
          Cmd: serviceConfig.command,
          ExposedPorts: Object.keys(exposedPorts).length > 0 ? exposedPorts : undefined,
          Labels: {
            'com.docker.compose.project': name,
            'com.docker.compose.service': serviceName,
            'com.docker.stack.namespace': name
          },
          HostConfig: {
            PortBindings: Object.keys(portBindings).length > 0 ? portBindings : undefined,
            Binds: binds.length > 0 ? binds : undefined,
            RestartPolicy: {
              Name: serviceConfig.restart || 'unless-stopped',
              MaximumRetryCount: 0
            },
            NetworkMode: Object.keys(networksConfig)[0] || undefined
          }
        };

        const container = await this.docker.createContainer(containerConfig);
        createdResources.containers.push(container.id);

        // Connect to additional networks
        if (Object.keys(networksConfig).length > 1) {
          const networkNames = Object.keys(networksConfig).slice(1);
          for (const networkName of networkNames) {
            const network = this.docker.getNetwork(networkName);
            await network.connect({ Container: container.id });
          }
        }

        // Start container
        await container.start();
      }

      return {
        success: true,
        stack: name,
        resources: createdResources
      };
    } catch (error) {
      // Rollback on error
      console.error('Error deploying stack, rolling back:', error);
      
      // Stop and remove containers
      for (const containerId of createdResources.containers) {
        try {
          const container = this.docker.getContainer(containerId);
          await container.stop();
          await container.remove();
        } catch (e) {
          console.error('Error removing container:', e.message);
        }
      }

      throw error;
    }
  }

  async removeStack(stackName) {
    if (!this.available) {
      throw new Error('Docker is not available');
    }

    const containers = await this.listContainers(true);
    const stackContainers = containers.filter(c => 
      c.Labels && (
        c.Labels['com.docker.compose.project'] === stackName ||
        c.Labels['com.docker.stack.namespace'] === stackName
      )
    );

    // Stop and remove all containers in the stack
    for (const containerInfo of stackContainers) {
      try {
        const container = this.docker.getContainer(containerInfo.Id);
        if (containerInfo.State === 'running') {
          await container.stop();
        }
        await container.remove();
      } catch (error) {
        console.error(`Error removing container ${containerInfo.Id}:`, error.message);
      }
    }

    // Remove networks
    const networks = await this.listNetworks();
    const stackNetworks = networks.filter(n => 
      n.Name.startsWith(`${stackName}_`)
    );
    for (const network of stackNetworks) {
      try {
        await this.removeNetwork(network.Id);
      } catch (error) {
        console.error(`Error removing network ${network.Name}:`, error.message);
      }
    }

    // Remove volumes (optional, commented out for safety)
    // const volumes = await this.listVolumes();
    // const stackVolumes = volumes.Volumes?.filter(v => 
    //   v.Name.startsWith(`${stackName}_`)
    // ) || [];
    // for (const volume of stackVolumes) {
    //   try {
    //     await this.removeVolume(volume.Name);
    //   } catch (error) {
    //     console.error(`Error removing volume ${volume.Name}:`, error.message);
    //   }
    // }

    return { success: true, removed: stackContainers.length };
  }

  async listStacks() {
    if (!this.available) {
      throw new Error('Docker is not available');
    }

    const containers = await this.listContainers(true);
    const stacks = {};

    containers.forEach(container => {
      const stackName = container.Labels?.['com.docker.compose.project'] || 
                       container.Labels?.['com.docker.stack.namespace'];
      
      if (stackName) {
        if (!stacks[stackName]) {
          stacks[stackName] = {
            name: stackName,
            services: []
          };
        }
        
        stacks[stackName].services.push({
          name: container.Labels['com.docker.compose.service'] || container.Names[0],
          container: container.Id,
          state: container.State,
          status: container.Status
        });
      }
    });

    return Object.values(stacks);
  }
}

export default new DockerAPI();
