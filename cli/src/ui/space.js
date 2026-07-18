const BAYER_4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

export const ASCII_RAMP = [" ", ".", "·", ":", "-", "=", "+", "*", "#", "%", "@"];

function clamp(value, minimum = 0, maximum = 1) {
  return Math.max(minimum, Math.min(maximum, value));
}

function normalize([x, y, z]) {
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
}

function dot([ax, ay, az], [bx, by, bz]) {
  return ax * bx + ay * by + az * bz;
}

function craterSurface(normal, sphere, time) {
  let radialOffset = 0;
  let slope = [0, 0, 0];
  const angle = time * sphere.rotation * 0.22;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);

  for (const crater of sphere.craters ?? []) {
    const [sourceX, sourceY, sourceZ] = normalize(crater.direction);
    const center = normalize([
      sourceX * cosine + sourceZ * sine,
      sourceY,
      -sourceX * sine + sourceZ * cosine,
    ]);
    const alignment = clamp(dot(normal, center), -1, 1);
    const distance = Math.sqrt(Math.max(0, 2 - alignment * 2));
    if (distance >= crater.radius) continue;

    const progress = distance / crater.radius;
    let height;
    let derivative;
    if (progress < 0.72) {
      const basin = progress / 0.72;
      height = -crater.depth * (1 - basin * basin);
      derivative = (2 * crater.depth * progress) / (0.72 * 0.72);
    } else {
      const rim = (progress - 0.72) / 0.28;
      height = crater.depth * 0.28 * Math.sin(Math.PI * rim);
      derivative = crater.depth * Math.PI * Math.cos(Math.PI * rim);
    }
    radialOffset += height;

    const tangent = [
      normal[0] - center[0] * alignment,
      normal[1] - center[1] * alignment,
      normal[2] - center[2] * alignment,
    ];
    const tangentLength = Math.hypot(...tangent);
    if (tangentLength > 0.0001) {
      const strength = derivative / crater.radius;
      slope = [
        slope[0] + (tangent[0] / tangentLength) * strength,
        slope[1] + (tangent[1] / tangentLength) * strength,
        slope[2] + (tangent[2] / tangentLength) * strength,
      ];
    }
  }

  return {
    radialOffset,
    normal: normalize([
      normal[0] - slope[0],
      normal[1] - slope[1],
      normal[2] - slope[2],
    ]),
  };
}

export function projectSpheres(space, time) {
  return space.spheres.map((sphere, index) => {
    const angle = time * sphere.speed + sphere.phase;
    return {
      ...sphere,
      index,
      center: [
        sphere.position[0] + Math.sin(angle) * sphere.orbit[0],
        sphere.position[1] + Math.cos(angle * 0.83) * sphere.orbit[1],
        sphere.position[2] + Math.sin(angle * 0.61) * sphere.orbit[2],
      ],
    };
  });
}

function pointLight(space, time) {
  const angle = time * space.lightSpeed;
  return [Math.cos(angle) * 2.2, 1.15 + Math.sin(angle * 0.71) * 0.45, 2.4];
}

function shade(normal, point, light, sphere, time, ambient) {
  const toLight = normalize([light[0] - point[0], light[1] - point[1], light[2] - point[2]]);
  const diffuse = Math.max(0, dot(normal, toLight));
  const halfVector = normalize([toLight[0], toLight[1], toLight[2] + 1]);
  const specular = Math.pow(Math.max(0, dot(normal, halfVector)), 28);
  const rim = Math.pow(1 - Math.max(0, normal[2]), 2);
  const texture = 0.92 + Math.sin(normal[0] * 15 + normal[1] * 9 + time * sphere.rotation) * 0.08;
  return clamp((ambient + diffuse * 0.72 + specular * 0.38 + rim * 0.1) * texture);
}

function dither(luminance, x, y) {
  const threshold = (BAYER_4[y % 4][x % 4] + 0.5) / 16 - 0.5;
  const adjusted = clamp(luminance + threshold * (1.7 / (ASCII_RAMP.length - 1)));
  return ASCII_RAMP[Math.round(adjusted * (ASCII_RAMP.length - 1))];
}

function emptyCell() {
  return { char: " ", tone: "empty" };
}

export function fitSpheresToViewport(spheres, width, height, occlusionWidth = 0) {
  const aspect = width / Math.max(1, height * 2);
  const pixelHeight = 2 / Math.max(1, height);
  const margin = pixelHeight * 1.25;
  const occlusionHalf = (occlusionWidth * aspect) / Math.max(1, width);

  return spheres.map((sphere) => {
    const sideWidth = aspect - occlusionHalf;
    const sideRadius = occlusionWidth > 0 ? Math.max(0, ((sideWidth - margin * 2) / 2) * 0.96) : sphere.radius;
    const radius = Math.min(sphere.radius, sideRadius, aspect - margin, 1 - margin);
    if (radius < pixelHeight * 1.5) return { ...sphere, hidden: true };

    let centerX;
    if (occlusionWidth > 0) {
      const left = sphere.position[0] < 0;
      const minimum = left ? -aspect + radius + margin : occlusionHalf + radius + margin;
      const maximum = left ? -occlusionHalf - radius - margin : aspect - radius - margin;
      if (minimum > maximum) return { ...sphere, hidden: true };
      const midpoint = (minimum + maximum) / 2;
      const halfRange = (maximum - minimum) / 2;
      const orbitProgress = sphere.orbit[0] === 0
        ? 0
        : clamp((sphere.center[0] - sphere.position[0]) / Math.abs(sphere.orbit[0]), -1, 1);
      centerX = midpoint + orbitProgress * halfRange;
    } else {
      centerX = sphere.center[0];
    }

    const centerY = clamp(sphere.center[1], -1 + radius + margin, 1 - radius - margin);
    if (centerX + radius <= -aspect || centerX - radius >= aspect) return { ...sphere, hidden: true };
    return {
      ...sphere,
      radius,
      center: [centerX, centerY, sphere.center[2]],
      hidden: false,
    };
  });
}

export function renderSpaceField(width, height, time, space, { occlusionWidth = 0 } = {}) {
  const aspect = width / Math.max(1, height * 2);
  const pixelHeight = 2 / Math.max(1, height);
  const spheres = fitSpheresToViewport(projectSpheres(space, time), width, height, occlusionWidth);
  const light = pointLight(space, time);
  const field = Array.from({ length: height }, () => Array.from({ length: width }, emptyCell));

  for (let row = 0; row < height; row += 1) {
    const worldY = 1 - ((row + 0.5) / height) * 2;
    for (let column = 0; column < width; column += 1) {
      const worldX = (((column + 0.5) / width) * 2 - 1) * aspect;

      let hit = null;
      for (const sphere of spheres) {
        if (sphere.hidden) continue;
        const dx = worldX - sphere.center[0];
        const dy = worldY - sphere.center[1];
        const radialSquared = dx * dx + dy * dy;
        const radiusSquared = sphere.radius * sphere.radius;
        if (radialSquared > radiusSquared) continue;
        const localZ = Math.sqrt(radiusSquared - radialSquared);
        const baseNormal = [dx / sphere.radius, dy / sphere.radius, localZ / sphere.radius];
        const crater = craterSurface(baseNormal, sphere, time);
        const surfaceZ = sphere.center[2] + localZ + crater.radialOffset * baseNormal[2] * sphere.radius;
        if (!hit || surfaceZ > hit.surfaceZ) {
          hit = { sphere, dx, dy, localZ, surfaceZ, normal: crater.normal };
        }
      }

      if (!hit) continue;
      const { sphere, dx, dy, surfaceZ, normal } = hit;
      const point = [worldX, worldY, surfaceZ];
      const edgeDistance = sphere.radius - Math.hypot(dx, dy);
      const coverage = clamp(edgeDistance / pixelHeight + 0.5);
      const luminance = shade(normal, point, light, sphere, time, space.ambient) * coverage;
      const character = dither(luminance, column, row);
      if (character !== " ") {
        field[row][column] = {
          char: character,
          tone: `sphere-${sphere.index}`,
          color: sphere.color,
        };
      }
    }
  }
  return field;
}
