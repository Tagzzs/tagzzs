export interface BranchPosition {
  x: number;
  y: number;
}

export function drawConnections(
  svgElement: SVGSVGElement,
  containerElement: HTMLElement,
  branchPositions: Map<string, BranchPosition>
): void {
  const centerX = containerElement.offsetWidth / 2;
  const centerY = containerElement.offsetHeight / 2;

  // Clear SVG and add filter
  svgElement.innerHTML = `
    <defs>
      <filter id="glow">
        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  `;

  branchPositions.forEach((position) => {
    const branchX = position.x;
    const branchY = position.y;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

    const dx = branchX - centerX;
    const dy = branchY - centerY;
    const cx1 = centerX + dx * 0.3;
    const cy1 = centerY + dy * 0.1;
    const cx2 = centerX + dx * 0.7;
    const cy2 = centerY + dy * 0.9;

    path.setAttribute(
      'd',
      `M ${centerX} ${centerY} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${branchX} ${branchY}`
    );
    path.setAttribute('stroke', 'rgba(167, 139, 250, 0.3)');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('fill', 'none');
    path.setAttribute('filter', 'url(#glow)');

    svgElement.appendChild(path);
  });
}

export function calculateBranchPositions(
  containerElement: HTMLElement,
  branchElements: Map<string, HTMLElement>
): Map<string, BranchPosition> {
  const positions = new Map<string, BranchPosition>();
  const containerRect = containerElement.getBoundingClientRect();

  branchElements.forEach((element, category) => {
    const rect = element.getBoundingClientRect();
    const x = rect.left - containerRect.left + rect.width / 2;
    const y = rect.top - containerRect.top + rect.height / 2;
    positions.set(category, { x, y });
  });

  return positions;
}