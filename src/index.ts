import { DefaultMap, defined } from "@glideapps/ts-necessities";

export interface Graph<T> {
    getAllNodes(): Iterable<T>;
    getAdjacentNodes(n: T): Iterable<T>;
}

export function makeGraphFromEdges<T>(edges: ReadonlyMap<T, ReadonlySet<T>>): Graph<T> {
    const nodes = new Set<T>();
    for (const [n, outs] of edges) {
        nodes.add(n);
        for (const o of outs) {
            nodes.add(o);
        }
    }
    return {
        getAllNodes(): Iterable<T> {
            return nodes;
        },
        getAdjacentNodes(n: T): Iterable<T> {
            return edges.get(n) ?? [];
        },
    };
}

// Returns `undefined` if the graph contains no cycles.
export function getCycleNodesInGraph<T>(graph: Graph<T>): ReadonlySet<T> | undefined {
    const nodes = new Set(graph.getAllNodes());

    const outEdges = new Map<T, Set<T>>();
    for (const n of nodes) {
        const outs = graph.getAdjacentNodes(n);
        outEdges.set(n, new Set(outs));
    }

    const inEdges = new DefaultMap<T, Set<T>>(() => new Set());
    for (const [n, outs] of outEdges) {
        for (const o of outs) {
            inEdges.get(o).add(n);
        }
    }

    function inDegree(n: T): number {
        return inEdges.get(n).size;
    }

    function outDegree(n: T): number {
        return outEdges.get(n)?.size ?? 0;
    }

    function removeNode(n: T): void {
        const outs = outEdges.get(n) ?? [];
        const ins = inEdges.get(n);
        for (const o of outs) {
            inEdges.get(o).delete(n);
        }
        for (const i of ins) {
            outEdges.get(i)?.delete(n);
        }
        nodes.delete(n);
    }

    while (nodes.size > 0) {
        const toRemove = Array.from(nodes).filter(n => inDegree(n) === 0 || outDegree(n) === 0);
        if (toRemove.length === 0) {
            return nodes;
        }
        for (const n of toRemove) {
            removeNode(n);
        }
    }

    return undefined;
}

export function getCyclesInGraph<T>(graph: Graph<T>, cycleNodes: ReadonlySet<T>): readonly (readonly T[])[] {
    const nodesRemaining = new Set(cycleNodes);
    const cycles: (readonly T[])[] = [];

    while (nodesRemaining.size > 0) {
        let n = defined(Array.from(nodesRemaining)[0]);
        const nodesVisited: T[] = [n];

        for (;;) {
            const adjacent = graph.getAdjacentNodes(n);
            const next = Array.from(adjacent).find(a => nodesRemaining.has(a));
            if (next === undefined) {
                nodesRemaining.delete(n);
                break;
            }
            const index = nodesVisited.indexOf(next);
            if (index >= 0) {
                const cycle = nodesVisited.slice(index);
                for (const x of cycle) {
                    nodesRemaining.delete(x);
                }
                cycles.push(cycle);
                break;
            } else {
                nodesVisited.push(next);
                n = next;
            }
        }
    }

    return cycles;
}
