import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import MountainArt from './MountainArt';

describe('MountainArt', () => {
  it('renders an svg at the requested size', () => {
    const { container } = render(
      <MountainArt
        rock="#123456"
        snow="#abcdef"
        seed={1}
        peakHeightFraction={0.6}
        width={100}
        height={40}
      />,
    );
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '100');
    expect(svg).toHaveAttribute('height', '40');
    expect(svg).toHaveAttribute('viewBox', '0 0 100 40');
  });

  it('paints the silhouette and snow cap with the given colors, via a gradient', () => {
    const { container } = render(
      <MountainArt rock="#123456" snow="#abcdef" seed={2} peakHeightFraction={0.6} />,
    );
    const stops = container.querySelectorAll('stop');
    const stopColors = Array.from(stops).map((s) => s.getAttribute('stop-color'));
    expect(stopColors).toContain('#123456');
    expect(stopColors).toContain('#abcdef');
    expect(container.querySelector('path[fill="#abcdef"]')).not.toBeNull();
  });

  it('uses a unique gradient id per instance, so many mountains rendered together do not collide', () => {
    const { container } = render(
      <>
        <MountainArt rock="#111" snow="#eee" seed={1} peakHeightFraction={0.5} />
        <MountainArt rock="#222" snow="#ddd" seed={2} peakHeightFraction={0.5} />
      </>,
    );
    const gradientIds = Array.from(container.querySelectorAll('linearGradient')).map((g) =>
      g.getAttribute('id'),
    );
    expect(gradientIds).toHaveLength(2);
    expect(new Set(gradientIds).size).toBe(2);
  });

  it('gives every peak id (1-10) a distinct silhouette shape', () => {
    const paths = Array.from({ length: 10 }, (_, i) => {
      const { container } = render(
        <MountainArt rock="#123" snow="#abc" seed={i + 1} peakHeightFraction={0.6} />,
      );
      return container.querySelector('path')?.getAttribute('d');
    });
    expect(new Set(paths).size).toBe(10);
  });
});
