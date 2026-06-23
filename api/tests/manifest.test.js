const fs = require('fs');
const { getMediaEntry, setMediaEntry, getMediaPath, setMediaPath } = require('../src/utils/manifest');

jest.mock('fs');

describe('Manifest Utilities - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMediaEntry', () => {
    test('deve retornar nulls se o manifesto ou ID nao existirem', () => {
      fs.existsSync.mockReturnValue(false);

      const entry = getMediaEntry('movies', 999);
      expect(entry).toEqual({ media_path: null, thumb_path: null });
      expect(fs.readFileSync).not.toHaveBeenCalled();
    });

    test('deve retornar media_path e thumb_path nulo para entradas no formato antigo (string)', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify({
        "10": "uploads/movies/old_format.mp4"
      }));

      const entry = getMediaEntry('movies', 10);
      expect(entry).toEqual({
        media_path: "uploads/movies/old_format.mp4",
        thumb_path: null
      });
    });

    test('deve retornar ambos os caminhos para entradas no formato novo (objeto)', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify({
        "12": {
          "media_path": "uploads/movies/new_media.mp4",
          "thumb_path": "uploads/movies/new_thumb.jpg"
        }
      }));

      const entry = getMediaEntry('movies', 12);
      expect(entry).toEqual({
        media_path: "uploads/movies/new_media.mp4",
        thumb_path: "uploads/movies/new_thumb.jpg"
      });
    });
  });

  describe('setMediaEntry', () => {
    test('deve criar uma nova entrada no formato objeto se ID nao existir', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify({}));

      setMediaEntry('movies', 15, 'media.mp4', 'thumb.jpg');

      expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
      const writeArgs = fs.writeFileSync.mock.calls[0];
      const parsedData = JSON.parse(writeArgs[1]);

      expect(parsedData["15"]).toEqual({
        media_path: 'media.mp4',
        thumb_path: 'thumb.jpg'
      });
    });

    test('deve atualizar apenas o thumb_path e preservar o media_path existente', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify({
        "12": {
          "media_path": "existing_media.mp4",
          "thumb_path": "existing_thumb.jpg"
        }
      }));

      setMediaEntry('movies', 12, null, 'new_thumb.jpg');

      expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
      const parsedData = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
      expect(parsedData["12"]).toEqual({
        media_path: 'existing_media.mp4',
        thumb_path: 'new_thumb.jpg'
      });
    });

    test('deve converter entrada do formato antigo (string) para objeto quando atualizado', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify({
        "10": "old_media.mp4"
      }));

      setMediaEntry('movies', 10, null, 'added_thumb.jpg');

      expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
      const parsedData = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
      expect(parsedData["10"]).toEqual({
        media_path: 'old_media.mp4',
        thumb_path: 'added_thumb.jpg'
      });
    });
  });

  describe('getMediaPath / setMediaPath wrappers', () => {
    test('getMediaPath deve retornar media_path de string antiga ou objeto novo', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify({
        "10": "old_media.mp4",
        "12": {
          "media_path": "new_media.mp4",
          "thumb_path": "new_thumb.jpg"
        }
      }));

      expect(getMediaPath('movies', 10)).toBe('old_media.mp4');
      expect(getMediaPath('movies', 12)).toBe('new_media.mp4');
      expect(getMediaPath('movies', 99)).toBeNull();
    });

    test('setMediaPath deve gravar entrada com apenas o media_path', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify({}));

      setMediaPath('movies', 20, 'only_media.mp4');

      expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
      const parsedData = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
      expect(parsedData["20"]).toEqual({
        media_path: 'only_media.mp4'
      });
    });
  });
});
