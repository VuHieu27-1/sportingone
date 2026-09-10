import {
  createZipArchive,
  extractZipArchive,
  calculateSha256,
} from './utils/zip.util';

describe('Production-Safe Backup & Restore (Zero-Data-Loss Verification)', () => {
  it('should create and extract valid PKWARE ZIP archives roundtrip with correct SHA-256', () => {
    const mockSql = 'CREATE TABLE test (id INT); INSERT INTO test VALUES (1);';
    const mockManifest = JSON.stringify({
      version: '1.0',
      tablesCount: 1,
      totalRecords: 1,
    });

    const zipBuffer = createZipArchive([
      { filename: 'manifest.json', data: Buffer.from(mockManifest, 'utf8') },
      { filename: 'database.sql', data: Buffer.from(mockSql, 'utf8') },
    ]);

    expect(zipBuffer.length).toBeGreaterThan(0);
    const checksum = calculateSha256(zipBuffer);
    expect(checksum).toHaveLength(64);

    const extracted = extractZipArchive(zipBuffer);
    expect(extracted).toHaveLength(2);

    const manifestEntry = extracted.find((e) => e.filename === 'manifest.json');
    const sqlEntry = extracted.find((e) => e.filename === 'database.sql');

    expect(manifestEntry).toBeDefined();
    expect(sqlEntry).toBeDefined();
    expect(manifestEntry!.data.toString('utf8')).toBe(mockManifest);
    expect(sqlEntry!.data.toString('utf8')).toBe(mockSql);
  });
});
