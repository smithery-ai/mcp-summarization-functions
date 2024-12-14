'use strict';

const mockExecaFn = jest.fn().mockImplementation(async (command, options = {}) => ({
  stdout: 'test output',
  stderr: '',
  failed: false,
  exitCode: 0,
  command,
  escapedCommand: command,
  isCanceled: false,
  killed: false,
  timedOut: false,
  stdio: ['pipe', 'pipe', 'pipe']
}));

// Create the execa function with the execa property
const execa = mockExecaFn;
execa.execa = mockExecaFn;

// Export both the function and the object
module.exports = execa;
module.exports.execa = mockExecaFn;
module.exports.default = execa;