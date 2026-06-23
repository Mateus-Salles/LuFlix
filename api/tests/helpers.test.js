const { exec } = require('child_process');
const {
  isPositiveInteger,
  normalizeIds,
  getRelativeMediaPath,
  getVideoDuration,
  extractMiddleFrame
} = require('../src/controllers/catalog.controller');

jest.mock('child_process');

describe('Catalog Helpers - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isPositiveInteger', () => {
    test('deve retornar true para inteiros positivos válidos', () => {
      expect(isPositiveInteger(10)).toBe(true);
      expect(isPositiveInteger("42")).toBe(true);
    });

    test('deve retornar false para zeros ou negativos', () => {
      expect(isPositiveInteger(0)).toBe(false);
      expect(isPositiveInteger(-5)).toBe(false);
      expect(isPositiveInteger("-3")).toBe(false);
    });

    test('deve retornar false para valores não inteiros ou inválidos', () => {
      expect(isPositiveInteger("abc")).toBe(false);
      expect(isPositiveInteger(5.5)).toBe(false);
      expect(isPositiveInteger(null)).toBe(false);
      expect(isPositiveInteger(undefined)).toBe(false);
    });
  });

  describe('normalizeIds', () => {
    test('deve filtrar valores vazios ou nulos de um array', () => {
      const input = [1, null, 2, undefined, '', 3];
      expect(normalizeIds(input)).toEqual([1, 2, 3]);
    });

    test('deve converter valor unico para array contendo o valor', () => {
      expect(normalizeIds(42)).toEqual([42]);
      expect(normalizeIds('10')).toEqual(['10']);
    });

    test('deve retornar array vazio para entradas invalidas ou vazias', () => {
      expect(normalizeIds(null)).toEqual([]);
      expect(normalizeIds(undefined)).toEqual([]);
      expect(normalizeIds('')).toEqual([]);
    });
  });

  describe('getRelativeMediaPath', () => {
    test('deve retornar null se o caminho for nulo ou indefinido', () => {
      expect(getRelativeMediaPath(null)).toBeNull();
      expect(getRelativeMediaPath(undefined)).toBeNull();
    });

    test('deve converter caminhos absolutos com barras normais', () => {
      const p = require('path');
      const absolute = p.resolve(__dirname, '../uploads/movies/test.mp4');
      const relative = getRelativeMediaPath(absolute);
      expect(relative).toBe('uploads/movies/test.mp4');
    });
  });

  describe('getVideoDuration', () => {
    test('deve retornar a duracao obtida via ffprobe', async () => {
      exec.mockImplementation((cmd, callback) => {
        callback(null, ' 124.50 \n', '');
      });

      const duration = await getVideoDuration('dummy_path.mp4');
      expect(duration).toBe(124.50);
      expect(exec).toHaveBeenCalledTimes(1);
      expect(exec.mock.calls[0][0]).toContain('ffprobe');
    });

    test('deve retornar 0 em caso de erro no ffprobe', async () => {
      exec.mockImplementation((cmd, callback) => {
        callback(new Error('ffprobe failed'), '', 'some stderr error');
      });

      const duration = await getVideoDuration('dummy_path.mp4');
      expect(duration).toBe(0);
    });
  });

  describe('extractMiddleFrame', () => {
    test('deve executar o comando ffmpeg com o tempo correspondente a metade da duracao', async () => {
      // Mock da duracao do video de 100 segundos
      exec.mockImplementation((cmd, callback) => {
        if (cmd.includes('ffprobe')) {
          callback(null, '100\n', '');
        } else if (cmd.includes('ffmpeg')) {
          callback(null, 'ffmpeg success', '');
        }
      });

      await extractMiddleFrame('dummy_video.mp4', 'dummy_output.jpg');

      expect(exec).toHaveBeenCalledTimes(2);
      // O segundo comando (ffmpeg) deve conter -ss 50
      const ffmpegCmd = exec.mock.calls[1][0];
      expect(ffmpegCmd).toContain('-ss 50');
      expect(ffmpegCmd).toContain('-vframes 1');
    });

    test('deve usar tempo padrao se a duracao for 0 ou invalida', async () => {
      exec.mockImplementation((cmd, callback) => {
        if (cmd.includes('ffprobe')) {
          callback(new Error('ffprobe error'), '', '');
        } else if (cmd.includes('ffmpeg')) {
          callback(null, 'ffmpeg success', '');
        }
      });

      await extractMiddleFrame('dummy_video.mp4', 'dummy_output.jpg');

      expect(exec).toHaveBeenCalledTimes(2);
      const ffmpegCmd = exec.mock.calls[1][0];
      expect(ffmpegCmd).toContain('-ss 1'); // fallback para 1s
    });
  });
});
