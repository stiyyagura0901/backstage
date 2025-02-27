/*
 * Copyright 2021 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import fs from 'fs-extra';
import mockFs from 'mock-fs';
import child_process from 'child_process';
import path from 'path';
import {
  Task,
  buildAppTask,
  checkAppExistsTask,
  checkPathExistsTask,
  createTemporaryAppFolderTask,
  moveAppTask,
  templatingTask,
} from './tasks';

jest.spyOn(Task, 'log').mockReturnValue(undefined);
jest.spyOn(Task, 'error').mockReturnValue(undefined);
jest.spyOn(Task, 'section').mockReturnValue(undefined);
jest
  .spyOn(Task, 'forItem')
  .mockImplementation((_a, _b, taskFunc) => taskFunc());

jest.mock('child_process');

// By mocking this the filesystem mocks won't mess with reading all of the package.jsons
jest.mock('./versions', () => ({
  packageVersions: {
    root: '1.2.3',
    '@backstage/cli': '1.0.0',
    '@backstage/backend-common': '1.0.0',
    '@backstage/backend-tasks': '1.0.0',
    '@backstage/catalog-model': '1.0.0',
    '@backstage/catalog-client': '1.0.0',
    '@backstage/config': '1.0.0',
    '@backstage/plugin-app-backend': '1.0.0',
    '@backstage/plugin-auth-backend': '1.0.0',
    '@backstage/plugin-auth-node': '1.0.0',
    '@backstage/plugin-catalog-backend': '1.0.0',
    '@backstage/plugin-permission-common': '1.0.0',
    '@backstage/plugin-permission-node': '1.0.0',
    '@backstage/plugin-proxy-backend': '1.0.0',
    '@backstage/plugin-scaffolder-backend': '1.0.0',
    '@backstage/plugin-search-backend': '1.0.0',
    '@backstage/plugin-search-backend-module-pg': '1.0.0',
    '@backstage/plugin-search-backend-node': '1.0.0',
    '@backstage/plugin-techdocs-backend': '1.0.0',
    '@backstage/app-defaults': '1.0.0',
    '@backstage/core-app-api': '1.0.0',
    '@backstage/core-components': '1.0.0',
    '@backstage/core-plugin-api': '1.0.0',
    '@backstage/integration-react': '1.0.0',
    '@backstage/plugin-api-docs': '1.0.0',
    '@backstage/plugin-catalog': '1.0.0',
    '@backstage/plugin-catalog-common': '1.0.0',
    '@backstage/plugin-catalog-graph': '1.0.0',
    '@backstage/plugin-catalog-import': '1.0.0',
    '@backstage/plugin-catalog-react': '1.0.0',
    '@backstage/plugin-github-actions': '1.0.0',
    '@backstage/plugin-org': '1.0.0',
    '@backstage/plugin-scaffolder': '1.0.0',
    '@backstage/plugin-permission-react': '1.0.0',
    '@backstage/plugin-search': '1.0.0',
    '@backstage/plugin-search-react': '1.0.0',
    '@backstage/plugin-tech-radar': '1.0.0',
    '@backstage/plugin-techdocs': '1.0.0',
    '@backstage/plugin-techdocs-react': '1.0.0',
    '@backstage/plugin-techdocs-module-addons-contrib': '1.0.0',
    '@backstage/plugin-user-settings': '1.0.0',
    '@backstage/theme': '1.0.0',
    '@backstage/test-utils': '1.0.0',
  },
}));

beforeEach(() => {
  mockFs({
    'projects/my-module.ts': '',
    'projects/dir/my-file.txt': '',
    'tmp/mockApp/.gitignore': '',
    'tmp/mockApp/package.json': '',
    'tmp/mockApp/packages/app/package.json': '',
    // load templates into mock filesystem
    'templates/': mockFs.load(path.resolve(__dirname, '../../templates/')),
  });
});

afterEach(() => {
  mockFs.restore();
});

describe('checkAppExistsTask', () => {
  it('should do nothing if the directory does not exist', async () => {
    const dir = 'projects/';
    const name = 'MyNewApp';
    await expect(checkAppExistsTask(dir, name)).resolves.not.toThrow();
  });

  it('should throw an error when a file of the same name exists', async () => {
    const dir = 'projects/';
    const name = 'my-module.ts';
    await expect(checkAppExistsTask(dir, name)).rejects.toThrow(
      'already exists',
    );
  });

  it('should throw an error when a directory of the same name exists', async () => {
    const dir = 'projects/';
    const name = 'dir';
    await expect(checkAppExistsTask(dir, name)).rejects.toThrow(
      'already exists',
    );
  });
});

describe('checkPathExistsTask', () => {
  it('should create a directory at the given path', async () => {
    const appDir = 'projects/newProject';
    await expect(checkPathExistsTask(appDir)).resolves.not.toThrow();
    expect(fs.existsSync(appDir)).toBe(true);
  });

  it('should do nothing if a directory of the same name exists', async () => {
    const appDir = 'projects/dir';
    await expect(checkPathExistsTask(appDir)).resolves.not.toThrow();
    expect(fs.existsSync(appDir)).toBe(true);
  });

  it('should fail if a file of the same name exists', async () => {
    await expect(checkPathExistsTask('projects/my-module.ts')).rejects.toThrow(
      'already exists',
    );
  });
});

describe('createTemporaryAppFolderTask', () => {
  it('should create a directory at a given path', async () => {
    const tempDir = 'projects/tmpFolder';
    await expect(createTemporaryAppFolderTask(tempDir)).resolves.not.toThrow();
    expect(fs.existsSync(tempDir)).toBe(true);
  });

  it('should fail if a directory of the same name exists', async () => {
    const tempDir = 'projects/dir';
    await expect(createTemporaryAppFolderTask(tempDir)).rejects.toThrow(
      'file already exists',
    );
  });

  it('should fail if a file of the same name exists', async () => {
    const tempDir = 'projects/dir/my-file.txt';
    await expect(createTemporaryAppFolderTask(tempDir)).rejects.toThrow(
      'file already exists',
    );
  });
});

describe('buildAppTask', () => {
  it('should change to `appDir` and run `yarn install` and `yarn tsc`', async () => {
    const mockChdir = jest.spyOn(process, 'chdir');
    const mockExec = child_process.exec as unknown as jest.MockedFunction<
      (
        command: string,
        callback: (error: null, stdout: string, stderr: string) => void,
      ) => void
    >;

    // requires callback implementation to support `promisify` wrapper
    // https://stackoverflow.com/a/60579617/10044859
    mockExec.mockImplementation((_command, callback) => {
      callback(null, 'standard out', 'standard error');
    });

    const appDir = 'projects/dir';
    await expect(buildAppTask(appDir)).resolves.not.toThrow();
    expect(mockChdir).toHaveBeenCalledTimes(2);
    expect(mockChdir).toHaveBeenNthCalledWith(1, appDir);
    expect(mockChdir).toHaveBeenNthCalledWith(2, appDir);
    expect(mockExec).toHaveBeenCalledTimes(2);
    expect(mockExec).toHaveBeenNthCalledWith(
      1,
      'yarn install',
      expect.any(Function),
    );
    expect(mockExec).toHaveBeenNthCalledWith(
      2,
      'yarn tsc',
      expect.any(Function),
    );
  });

  it('should fail if project directory does not exist', async () => {
    const appDir = 'projects/missingProject';
    await expect(buildAppTask(appDir)).rejects.toThrow(
      'no such file or directory',
    );
  });
});

describe('moveAppTask', () => {
  const tempDir = 'tmp/mockApp/';
  const id = 'myApp';

  it('should move all files in the temp dir to the target dir', async () => {
    const destination = 'projects/mockApp';
    await moveAppTask(tempDir, destination, id);
    expect(fs.existsSync('projects/mockApp/.gitignore')).toBe(true);
    expect(fs.existsSync('projects/mockApp/package.json')).toBe(true);
    expect(fs.existsSync('projects/mockApp/packages/app/package.json')).toBe(
      true,
    );
  });

  it('should fail to move files if destination already exists', async () => {
    const destination = 'projects';
    await expect(moveAppTask(tempDir, destination, id)).rejects.toThrow(
      'dest already exists',
    );
  });

  it('should remove temporary files if move succeeded', async () => {
    const destination = 'projects/mockApp';
    await moveAppTask(tempDir, destination, id);
    expect(fs.existsSync('tmp/mockApp')).toBe(false);
  });

  it('should remove temporary files if move failed', async () => {
    const destination = 'projects';
    await expect(moveAppTask(tempDir, destination, id)).rejects.toThrow();
    expect(fs.existsSync('tmp/mockApp')).toBe(false);
  });
});

describe('templatingTask', () => {
  it('should generate a project populating context parameters', async () => {
    const templateDir = 'templates/default-app';
    const destinationDir = 'templatedApp';
    const context = {
      name: 'SuperCoolBackstageInstance',
      dbTypeSqlite: true,
    };
    await templatingTask(templateDir, destinationDir, context);
    expect(fs.existsSync('templatedApp/package.json')).toBe(true);
    expect(fs.existsSync('templatedApp/.dockerignore')).toBe(true);
    await expect(fs.readJson('templatedApp/backstage.json')).resolves.toEqual({
      version: '1.2.3',
    });
    // catalog was populated with `context.name`
    expect(
      fs.readFileSync('templatedApp/catalog-info.yaml', 'utf-8'),
    ).toContain('name: SuperCoolBackstageInstance');
    // backend dependencies include `sqlite3` from `context.SQLite`
    expect(
      fs.readFileSync('templatedApp/packages/backend/package.json', 'utf-8'),
    ).toContain('sqlite3"');
  });
});
