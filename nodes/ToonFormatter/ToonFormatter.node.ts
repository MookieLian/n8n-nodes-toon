import type {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
} from 'n8n-workflow';
import { ApplicationError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

type JsonPrimitive = string | number | boolean | null;
interface JsonArray extends Array<JsonValue> {
    [index: number]: JsonValue;
}
interface JsonObject {
    [key: string]: JsonValue;
}
type JsonValue = JsonPrimitive | JsonArray | JsonObject;

const INDENT = '  ';

const indent = (value: string, depth: number) =>
    value
        .split('\n')
        .map((line) => (line.length ? `${INDENT.repeat(depth)}${line}` : line))
        .join('\n');

const isPlainObject = (value: JsonValue): value is Record<string, JsonValue> =>
    value !== null && typeof value === 'object' && !Array.isArray(value);

const stringifyPrimitive = (value: JsonValue): string => {
    if (value === null) return 'null';
    if (typeof value === 'string') {
        if (value.length === 0) return '""';
        return /[\s,]/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value;
    }
    if (typeof value === 'number') {
        return Number.isFinite(value) ? String(value) : `"${value}"`;
    }
    if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
    }
    return '';
};

const normalizeJson = (value: unknown): JsonValue => {
    if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }
    if (Array.isArray(value)) {
        return value.map((entry) => normalizeJson(entry));
    }
    if (typeof value === 'object') {
        const normalized: Record<string, JsonValue> = {};
        for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
            normalized[key] = normalizeJson(entry);
        }
        return normalized;
    }
    throw new ApplicationError('Value must be valid JSON');
};

const formatValue = (value: JsonValue, label: string | undefined, depth: number): string => {
    if (Array.isArray(value)) {
        return formatArray(value, label, depth);
    }
    if (isPlainObject(value)) {
        const header = label ? `${label}:` : 'object:';
        const entries = Object.entries(value);
        if (entries.length === 0) {
            return indent(`${header} {}`, depth);
        }
        const lines = [indent(header, depth)];
        for (const [childKey, childValue] of entries) {
            lines.push(formatValue(childValue, childKey, depth + 1));
        }
        return lines.join('\n');
    }
    if (label) {
        return indent(`${label}: ${stringifyPrimitive(value)}`, depth);
    }
    return indent(stringifyPrimitive(value), depth);
};

const formatArray = (value: JsonValue[], label: string | undefined, depth: number): string => {
    const keyLabel = label ?? 'items';
    if (value.length > 0 && value.every(isPlainObject)) {
        const fields = Array.from(
            value.reduce((set, entry) => {
                Object.keys(entry as Record<string, JsonValue>).forEach((key) => set.add(key));
                return set;
            }, new Set<string>()),
        );
        const header = `${keyLabel}[${value.length}]{${fields.join(',')}}:`;
        const lines = [indent(header, depth)];
        for (const entry of value as Array<Record<string, JsonValue>>) {
            const row = fields
                .map((field) => stringifyPrimitive(Object.prototype.hasOwnProperty.call(entry, field) ? entry[field] : null))
                .join(',');
            lines.push(indent(row, depth + 1));
        }
        return lines.join('\n');
    }
    const header = `${keyLabel}[${value.length}]:`;
    const lines = [indent(header, depth)];
    for (const entry of value) {
        if (Array.isArray(entry) || isPlainObject(entry)) {
            lines.push(formatValue(entry, undefined, depth + 1));
        } else {
            lines.push(indent(stringifyPrimitive(entry), depth + 1));
        }
    }
    return lines.join('\n');
};

const encodeToToon = (value: JsonValue): string => {
    if (Array.isArray(value)) {
        return formatArray(value, undefined, 0);
    }
    if (isPlainObject(value)) {
        const sections = Object.entries(value).map(([key, entry]) => formatValue(entry, key, 0));
        return sections.filter(Boolean).join('\n\n').trim();
    }
    return formatValue(value, 'value', 0);
};

export class ToonFormatter implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'TOON Formatter',
        name: 'toonFormatter',
        icon: { light: 'file:toonFormatter.svg', dark: 'file:toonFormatter.dark.svg' },
        group: ['transform'],
        version: 1,
        description: 'Formats any JSON payload into TOON text',
        defaults: {
            name: 'TOON Formatter',
        },
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        usableAsTool: true,
        properties: [
            {
                displayName: 'Input JSON',
                name: 'inputJson',
                type: 'json',
                typeOptions: {
                    rows: 4,
                },
                required: true,
                default: '{}',
                description: 'Dönüştürülecek veriyi girin veya önceki düğüme bağlamak için bir ifade kullanın',
                noDataExpression: true,
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnItems: INodeExecutionData[] = [];

        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            try {
                const rawInput = this.getNodeParameter('inputJson', itemIndex);
                const parsedInput =
                    typeof rawInput === 'string' && rawInput.trim().length > 0
                        ? JSON.parse(rawInput)
                        : rawInput;

                const jsonValue = normalizeJson(parsedInput);
                const toonPayload = encodeToToon(jsonValue);

                returnItems.push({
                    json: {
                        toon: toonPayload,
                    },
                    pairedItem: itemIndex,
                });
            } catch (error) {
                if (this.continueOnFail()) {
                    returnItems.push({
                        json: {
                            toon: '',
                            error: error instanceof Error ? error.message : 'Unknown error',
                        },
                        pairedItem: itemIndex,
                        error,
                    });
                    continue;
                }

                if (error instanceof NodeOperationError) {
                    throw error;
                }

                throw new NodeOperationError(this.getNode(), error as Error, {
                    itemIndex,
                });
            }
        }

        return [returnItems];
    }
}
