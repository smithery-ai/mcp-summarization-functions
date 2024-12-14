'use strict';

const fs = jest.createMockFromModule('fs');

// Mock Dirent class
class MockDirent {
  constructor(name, isDir) {
    this.name = name;
    this._isDir = isDir;
  }
  isDirectory() { return this._isDir; }
  isFile() { return !this._isDir; }
  isBlockDevice() { return false; }
  isCharacterDevice() { return false; }
  isFIFO() { return false; }
  isSocket() { return false; }
  isSymbolicLink() { return false; }
}

// Create mock functions with Jest mock functionality
const mockReadFile = jest.fn().mockImplementation(async () => 'test file content');
const mockReaddir = jest.fn().mockImplementation(async () => [
  new MockDirent('test.txt', false),
  new MockDirent('testDir', true)
]);

// Add Jest mock functions
mockReadFile.mockResolvedValue = jest.fn().mockImplementation((value) => {
  return mockReadFile.mockImplementation(async () => value);
});

mockReadFile.mockRejectedValue = jest.fn().mockImplementation((error) => {
  return mockReadFile.mockImplementation(async () => { throw error; });
});

mockReadFile.mockResolvedValueOnce = jest.fn().mockImplementation((value) => {
  return mockReadFile.mockImplementationOnce(async () => value);
});

mockReadFile.mockRejectedValueOnce = jest.fn().mockImplementation((error) => {
  return mockReadFile.mockImplementationOnce(async () => { throw error; });
});

// Add the same mock functions to readdir
mockReaddir.mockResolvedValue = jest.fn().mockImplementation((value) => {
  return mockReaddir.mockImplementation(async () => value);
});

mockReaddir.mockRejectedValue = jest.fn().mockImplementation((error) => {
  return mockReaddir.mockImplementation(async () => { throw error; });
});

mockReaddir.mockResolvedValueOnce = jest.fn().mockImplementation((value) => {
  return mockReaddir.mockImplementationOnce(async () => value);
});

mockReaddir.mockRejectedValueOnce = jest.fn().mockImplementation((error) => {
  return mockReaddir.mockImplementationOnce(async () => { throw error; });
});

fs.readFile = mockReadFile;
fs.readdir = mockReaddir;

module.exports = fs;
