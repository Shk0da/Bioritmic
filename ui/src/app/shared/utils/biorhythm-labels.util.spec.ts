import {
  formatCompatibilityPercent,
  getSummaryCompatibility,
  getSummaryCompatibilityAverage,
  getBiorhythmDescription,
  getCompatibilityLevelLabel,
} from './biorhythm-labels.util';

describe('biorhythm-labels.util', () => {
  it('formatCompatibilityPercent should clamp to 0..100', () => {
    expect(formatCompatibilityPercent(-5)).toBe(0);
    expect(formatCompatibilityPercent(150)).toBe(100);
    expect(formatCompatibilityPercent(72.6)).toBe(73);
  });

  it('getSummaryCompatibility should return cycles in stable order', () => {
    const items = getSummaryCompatibility({
      Physical: 80,
      Intellectual: 60,
      Heartfelt: 70,
    });

    expect(items.map(item => item.name)).toEqual(['Heartfelt', 'Physical', 'Intellectual']);
    expect(items[0].label).toBe('Сердечная');
  });

  it('getSummaryCompatibilityAverage should average summary cycles', () => {
    expect(getSummaryCompatibilityAverage({
      Heartfelt: 80,
      Physical: 70,
      Intellectual: 90,
    })).toBe(80);
  });

  it('getBiorhythmDescription should return chakra text without number', () => {
    expect(getBiorhythmDescription('Physical')).toBe(
      'Муладхара — физическое влечение, совпадение желаний'
    );
    expect(getBiorhythmDescription('Heartfelt')).toBe(
      'Анахата — принятие, преданность, бескорыстное добро'
    );
  });

  it('getCompatibilityLevelLabel should map percent to level', () => {
    expect(getCompatibilityLevelLabel(100)).toBe('Высокая');
    expect(getCompatibilityLevelLabel(55)).toBe('Средняя');
    expect(getCompatibilityLevelLabel(20)).toBe('Низкая');
  });
});
