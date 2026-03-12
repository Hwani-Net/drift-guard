import { describe, it, expect } from 'vitest';
import {
  computeStructureFingerprint,
  compareStructure,
} from '../../src/parsers/structure-parser.js';

describe('structure-parser', () => {
  describe('computeStructureFingerprint', () => {
    it('should count semantic tags', () => {
      const html = `
        <html><body>
          <header>Header</header>
          <nav>Nav</nav>
          <main>
            <section>S1</section>
            <section>S2</section>
            <section>S3</section>
          </main>
          <footer>Footer</footer>
        </body></html>
      `;
      const fp = computeStructureFingerprint(html);
      expect(fp.semanticTags.header).toBe(1);
      expect(fp.semanticTags.nav).toBe(1);
      expect(fp.semanticTags.main).toBe(1);
      expect(fp.semanticTags.section).toBe(3);
      expect(fp.semanticTags.footer).toBe(1);
    });

    it('should compute max nesting depth', () => {
      const html = `
        <html><body>
          <div>
            <div>
              <div>
                <span>Deep</span>
              </div>
            </div>
          </div>
        </body></html>
      `;
      const fp = computeStructureFingerprint(html);
      // body(0) > div(1) > div(2) > div(3) > span(4) = depth 4
      expect(fp.maxDepth).toBeGreaterThanOrEqual(4);
    });

    it('should handle empty HTML', () => {
      const fp = computeStructureFingerprint('<html><body></body></html>');
      expect(fp.maxDepth).toBe(0);
      expect(Object.keys(fp.semanticTags).length).toBe(0);
      expect(fp.layoutHash).toBe('empty');
      expect(fp.childSequenceHash).toBe('empty');
    });

    it('should generate consistent hashes for same structure', () => {
      const html = `
        <html><body>
          <header>H</header>
          <main>M</main>
          <footer>F</footer>
        </body></html>
      `;
      const fp1 = computeStructureFingerprint(html);
      const fp2 = computeStructureFingerprint(html);
      expect(fp1.childSequenceHash).toBe(fp2.childSequenceHash);
      expect(fp1.layoutHash).toBe(fp2.layoutHash);
    });

    it('should detect different child sequences', () => {
      const html1 = `<html><body><header>H</header><main>M</main><footer>F</footer></body></html>`;
      const html2 = `<html><body><header>H</header><nav>N</nav><main>M</main><footer>F</footer></body></html>`;

      const fp1 = computeStructureFingerprint(html1);
      const fp2 = computeStructureFingerprint(html2);

      expect(fp1.childSequenceHash).not.toBe(fp2.childSequenceHash);
    });

    it('should detect inline flex/grid layout elements', () => {
      const html = `
        <html><body>
          <div style="display: flex;" class="container">Content</div>
          <div style="display: grid;" class="grid-wrapper">Grid</div>
        </body></html>
      `;
      const fp = computeStructureFingerprint(html);
      expect(fp.layoutHash).not.toBe('empty');
    });

    it('should detect Tailwind flex/grid classes', () => {
      const html = `
        <html><body>
          <div class="flex items-center">Flex</div>
          <div class="grid grid-cols-3">Grid</div>
        </body></html>
      `;
      const fp = computeStructureFingerprint(html);
      expect(fp.layoutHash).not.toBe('empty');
    });

    it('should ignore script and link tags in child sequence', () => {
      const html = `
        <html><body>
          <script>var x = 1;</script>
          <header>H</header>
          <main>M</main>
          <link rel="stylesheet" href="style.css">
        </body></html>
      `;
      const htmlClean = `
        <html><body>
          <header>H</header>
          <main>M</main>
        </body></html>
      `;
      const fp1 = computeStructureFingerprint(html);
      const fp2 = computeStructureFingerprint(htmlClean);
      expect(fp1.childSequenceHash).toBe(fp2.childSequenceHash);
    });
  });

  describe('compareStructure', () => {
    it('should return empty array for identical structures', () => {
      const html = `<html><body><header>H</header><main>M</main></body></html>`;
      const fp = computeStructureFingerprint(html);
      const details = compareStructure(fp, fp);
      expect(details).toEqual([]);
    });

    it('should detect depth changes', () => {
      const shallow = computeStructureFingerprint(
        `<html><body><div>Hello</div></body></html>`
      );
      const deep = computeStructureFingerprint(
        `<html><body><div><div><div>Deep</div></div></div></body></html>`
      );
      const details = compareStructure(shallow, deep);
      expect(details.some(d => d.includes('maxDepth'))).toBe(true);
    });

    it('should detect semantic tag additions', () => {
      const before = computeStructureFingerprint(
        `<html><body><header>H</header><main>M</main></body></html>`
      );
      const after = computeStructureFingerprint(
        `<html><body><header>H</header><nav>N</nav><main>M</main></body></html>`
      );
      const details = compareStructure(before, after);
      expect(details.some(d => d.includes('<nav>'))).toBe(true);
    });

    it('should detect semantic tag removals', () => {
      const before = computeStructureFingerprint(
        `<html><body><header>H</header><main>M</main><footer>F</footer></body></html>`
      );
      const after = computeStructureFingerprint(
        `<html><body><header>H</header><main>M</main></body></html>`
      );
      const details = compareStructure(before, after);
      expect(details.some(d => d.includes('<footer>'))).toBe(true);
      expect(details.some(d => d.includes('removed'))).toBe(true);
    });

    it('should detect child sequence changes', () => {
      const before = computeStructureFingerprint(
        `<html><body><header>H</header><main>M</main></body></html>`
      );
      const after = computeStructureFingerprint(
        `<html><body><main>M</main><header>H</header></body></html>`
      );
      const details = compareStructure(before, after);
      expect(details.some(d => d.includes('child sequence'))).toBe(true);
    });
  });
});
