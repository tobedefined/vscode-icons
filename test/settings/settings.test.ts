// tslint:disable only-arrow-functions
// tslint:disable no-unused-expression
import { expect } from 'chai';
import * as fs from 'fs';
import * as sinon from 'sinon';
import { vscode } from '../../src/utils';
import { extensionSettings, SettingsManager } from '../../src/settings';
import { ExtensionStatus, IState } from '../../src/models';

describe('SettingsManager: tests', function () {

  context('ensures that', function () {

    context('getting the settings', function () {

      it('more than once, returns the same instance',
        function () {
          const settingsManager = new SettingsManager(vscode);
          const settings = settingsManager.getSettings();
          const settingsAgain = settingsManager.getSettings();
          expect(settings).to.be.an.instanceOf(Object);
          expect(settingsAgain).to.be.an.instanceOf(Object);
          expect(settingsAgain).to.be.deep.equal(settings);
        });

      context('sets the \'Home Directory\' to', function () {

        let env: any;
        let originalPlatform: any;

        beforeEach(() => {
          env = { ...process.env };
          originalPlatform = process.platform;
        });

        afterEach(() => {
          process.env = env;
          Object.defineProperty(process, 'platform', { value: originalPlatform });
        });

        it('\'USERPROFILE\' for win32 (windows)',
          function () {
            process.env.APPDATA = 'C:\Users\User\AppData\Roaming';
            Object.defineProperty(process, 'platform', { value: 'win32' });
            const settings = new SettingsManager(vscode).getSettings();
            expect(settings.extensionFolder).to.include('USERPROFILE');
          });

        it('\'HOME\' for darwin (macOS)',
          function () {
            Object.defineProperty(process, 'platform', { value: 'darwin' });
            const settings = new SettingsManager(vscode).getSettings();
            expect(settings.extensionFolder).to.include('HOME');
          });

        it('\'HOME\' for linux',
          function () {
            Object.defineProperty(process, 'platform', { value: 'linux' });
            const settings = new SettingsManager(vscode).getSettings();
            expect(settings.extensionFolder).to.include('HOME');
          });

      });

      context('returns the correct name when application is the', function () {

        it('\'Code - Insiders\'',
          function () {
            vscode.env.appName = 'Visual Studio Code - Insiders';
            const settings = new SettingsManager(vscode).getSettings();
            expect(settings.isInsiders).to.be.true;
          });

        it('\'Code\'',
          function () {
            vscode.env.appName = 'Visual Studio Code';
            const settings = new SettingsManager(vscode).getSettings();
            expect(settings.isInsiders).to.be.false;
          });

      });

    });

  });

  context('ensures that', function () {

    let settingsManager: SettingsManager;
    let sandbox: sinon.SinonSandbox;

    beforeEach(() => {
      settingsManager = new SettingsManager(vscode);
      sandbox = sinon.sandbox.create();
    });

    afterEach(() => {
      settingsManager = null;
      sandbox.restore();
    });

    it('the state gets written to a settings file',
      function () {
        const writeToFile = sandbox.stub(fs, 'writeFileSync');
        const stateMock: IState = {
          version: '0.0.0',
          status: ExtensionStatus.notActivated,
          welcomeShown: false,
        };
        settingsManager.setState(stateMock);
        expect(writeToFile.called).to.be.true;
      });

    it('the settings status gets updated',
      function () {
        const stateMock: IState = {
          version: "1.0.0",
          status: ExtensionStatus.notActivated,
          welcomeShown: false,
        };
        const getState = sinon.stub(settingsManager, 'getState').returns(stateMock);
        const setState = sinon.stub(settingsManager, 'setState');
        const status = ExtensionStatus.enabled;
        const state = settingsManager.updateStatus(status);
        expect(getState.called).to.be.true;
        expect(setState.called).to.be.true;
        expect(state.status).to.be.equal(status);
      });

    it('the settings file gets deleted',
      function () {
        const deleteFile = sandbox.stub(fs, 'unlinkSync');
        settingsManager.deleteState();
        expect(deleteFile.called).to.be.true;
      });

    context('getting the state', function () {

      it('returns the state from the settings file',
        function () {
          const stateMock: IState = {
            version: "1.0.0",
            status: ExtensionStatus.enabled,
            welcomeShown: true,
          };
          sandbox.stub(fs, 'existsSync').returns(true);
          sandbox.stub(fs, 'readFileSync').returns(JSON.stringify(stateMock));
          const state = settingsManager.getState();
          expect(state).to.be.an.instanceOf(Object);
          expect(state).to.have.all.keys('version', 'status', 'welcomeShown');
          expect(Object.keys(state)).to.have.lengthOf(3);
        });

      it('returns a default state if no settings file exists',
        function () {
          sandbox.stub(fs, 'existsSync').returns(false);
          const state = settingsManager.getState();
          expect(state).to.be.instanceOf(Object);
          expect(state.version).to.be.equal('0.0.0');
        });

      it('returns a default state if reading the file fails',
        function () {
          sandbox.stub(fs, 'existsSync').returns(true);
          sandbox.stub(fs, 'readFileSync').throws(Error);
          sandbox.stub(console, 'error');
          const state = settingsManager.getState();
          expect(state).to.be.instanceOf(Object);
          expect(state.version).to.be.equal('0.0.0');
        });

      it('returns a default state if parsing the file content fails',
        function () {
          sandbox.stub(fs, 'existsSync').returns(true);
          sandbox.stub(fs, 'readFileSync').returns('test');
          const state = settingsManager.getState();
          expect(state).to.be.instanceOf(Object);
          expect(state.version).to.be.equal('0.0.0');
        });

    });

    context('the \'isNewVersion\' function is', function () {

      it('truthy for a new extension version',
        function () {
          const stateMock: IState = {
            version: "1.0.0",
            status: ExtensionStatus.notActivated,
            welcomeShown: true,
          };
          const getState = sinon.stub(settingsManager, 'getState').returns(stateMock);
          settingsManager.getSettings();
          expect(settingsManager.isNewVersion()).to.be.true;
          expect(getState.called).to.be.true;
        });

      it('falsy for the same extension version',
        function () {
          const stateMock: IState = {
            version: extensionSettings.version,
            status: ExtensionStatus.notActivated,
            welcomeShown: true,
          };
          const getState = sinon.stub(settingsManager, 'getState').returns(stateMock);
          settingsManager.getSettings();
          expect(settingsManager.isNewVersion()).to.be.false;
          expect(getState.called).to.be.true;
        });

      it('falsy for an older extension version',
        function () {
          const stateMock: IState = {
            version: "100.0.0",
            status: ExtensionStatus.notActivated,
            welcomeShown: true,
          };
          const getState = sinon.stub(settingsManager, 'getState').returns(stateMock);
          settingsManager.getSettings();
          expect(settingsManager.isNewVersion()).to.be.false;
          expect(getState.called).to.be.true;
        });

    });

  });

});
