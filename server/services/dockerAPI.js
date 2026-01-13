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
}

export default new DockerAPI();
