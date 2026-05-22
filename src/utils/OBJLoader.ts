import { BufferGeometry, BufferAttribute, Vector3 } from './three';

export function parseOBJ(text: string): BufferGeometry {
  const vertices: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  
  const finalVertices: number[] = [];
  const finalNormals: number[] = [];
  const finalUvs: number[] = [];

  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length === 0 || line.startsWith('#')) continue;

    const parts = line.split(/\s+/);
    const type = parts[0];

    if (type === 'v') {
      vertices.push(
        parseFloat(parts[1]),
        parseFloat(parts[2]),
        parseFloat(parts[3])
      );
    } else if (type === 'vn') {
      normals.push(
        parseFloat(parts[1]),
        parseFloat(parts[2]),
        parseFloat(parts[3])
      );
    } else if (type === 'vt') {
      uvs.push(
        parseFloat(parts[1]),
        parseFloat(parts[2])
      );
    } else if (type === 'f') {
      // f v1/vt1/vn1 v2/vt2/vn2 v3/vt3/vn3
      const faceVertices = parts.slice(1);
      
      // Triangulate polygons
      for (let j = 1; j < faceVertices.length - 1; j++) {
        const v1 = faceVertices[0].split('/');
        const v2 = faceVertices[j].split('/');
        const v3 = faceVertices[j+1].split('/');

        const addVertex = (v: string[]) => {
          const vIdx = (parseInt(v[0]) - 1) * 3;
          finalVertices.push(vertices[vIdx], vertices[vIdx+1], vertices[vIdx+2]);

          if (v[1] && v[1] !== '') {
            const uvIdx = (parseInt(v[1]) - 1) * 2;
            finalUvs.push(uvs[uvIdx], uvs[uvIdx+1]);
          }

          if (v[2] && v[2] !== '') {
            const nIdx = (parseInt(v[2]) - 1) * 3;
            finalNormals.push(normals[nIdx], normals[nIdx+1], normals[nIdx+2]);
          }
        };

        addVertex(v1);
        addVertex(v2);
        addVertex(v3);
      }
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(finalVertices), 3));
  if (finalNormals.length > 0) {
    geometry.setAttribute('normal', new BufferAttribute(new Float32Array(finalNormals), 3));
  } else {
    geometry.computeVertexNormals();
  }
  if (finalUvs.length > 0) {
    geometry.setAttribute('uv', new BufferAttribute(new Float32Array(finalUvs), 2));
  }
  
  return geometry;
}
