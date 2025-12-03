/**
 * jFlow.js - Biblioteca de fluxo de dados para jQuery
 * Versão 1.0.0
 */

(function($, window, document) {
    'use strict';
    
    // Configurações globais
    const JFLOW_CONFIG = {
        version: '1.0.0',
        debug: false,
        animationSpeed: 300,
        maxDataPoints: 1000,
        dataFormats: ['json', 'csv', 'xml'],
        themes: ['light', 'dark', 'colorful']
    };
    
    // Classe principal
    class JFlow {
        constructor(element, options) {
            this.$element = $(element);
            this.options = $.extend({}, JFLOW_CONFIG, options);
            this.data = [];
            this.filters = {};
            this.transformations = [];
            this.listeners = {};
            this.init();
        }
        
        init() {
            this.log('Inicializando JFlow...');
            this.setupEvents();
            this.render();
        }
        
        setupEvents() {
            this.$element.on('jflow:dataLoaded', (e, data) => {
                this.handleDataLoaded(data);
            });
            
            this.$element.on('jflow:filterApplied', (e, filters) => {
                this.handleFilterApplied(filters);
            });
            
            this.$element.on('jflow:transformApplied', (e, transform) => {
                this.handleTransformApplied(transform);
            });
        }
        
        // Métodos de dados
        load(data, format = 'json') {
            this.log(`Carregando dados no formato: ${format}`);
            
            return new Promise((resolve, reject) => {
                try {
                    let parsedData;
                    
                    switch(format.toLowerCase()) {
                        case 'json':
                            parsedData = typeof data === 'string' ? JSON.parse(data) : data;
                            break;
                        case 'csv':
                            parsedData = this.parseCSV(data);
                            break;
                        case 'xml':
                            parsedData = this.parseXML(data);
                            break;
                        default:
                            throw new Error(`Formato não suportado: ${format}`);
                    }
                    
                    this.data = this.validateData(parsedData);
                    this.$element.trigger('jflow:dataLoaded', [this.data]);
                    resolve(this.data);
                } catch (error) {
                    this.error('Erro ao carregar dados:', error);
                    reject(error);
                }
            });
        }
        
        parseCSV(csvText) {
            const lines = csvText.split('\n');
            const headers = lines[0].split(',').map(h => h.trim());
            
            return lines.slice(1).map(line => {
                const values = line.split(',').map(v => v.trim());
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header] = values[index] || '';
                });
                return obj;
            });
        }
        
        parseXML(xmlText) {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
            const items = xmlDoc.getElementsByTagName('item');
            
            return Array.from(items).map(item => {
                const obj = {};
                Array.from(item.children).forEach(child => {
                    obj[child.tagName] = child.textContent;
                });
                return obj;
            });
        }
        
        validateData(data) {
            if (!Array.isArray(data)) {
                throw new Error('Dados devem ser um array');
            }
            
            // Limitar quantidade de pontos de dados
            if (data.length > this.options.maxDataPoints) {
                this.warn(`Dados truncados para ${this.options.maxDataPoints} registros`);
                return data.slice(0, this.options.maxDataPoints);
            }
            
            return data;
        }
        
        // Métodos de filtro
        filter(filters) {
            this.filters = $.extend({}, this.filters, filters);
            
            let filteredData = this.data;
            
            Object.entries(this.filters).forEach(([key, value]) => {
                if (value !== undefined && value !== '') {
                    filteredData = filteredData.filter(item => {
                        const itemValue = item[key];
                        
                        if (typeof value === 'function') {
                            return value(itemValue);
                        }
                        
                        if (typeof value === 'string') {
                            return String(itemValue).toLowerCase().includes(value.toLowerCase());
                        }
                        
                        return itemValue === value;
                    });
                }
            });
            
            this.$element.trigger('jflow:filterApplied', [this.filters]);
            return filteredData;
        }
        
        clearFilters() {
            this.filters = {};
            this.$element.trigger('jflow:filterApplied', [{}]);
            return this.data;
        }
        
        // Métodos de transformação
        transform(transformation) {
            if (typeof transformation !== 'function') {
                throw new Error('Transformação deve ser uma função');
            }
            
            this.transformations.push(transformation);
            const transformedData = transformation(this.data);
            
            this.$element.trigger('jflow:transformApplied', [transformation]);
            return transformedData;
        }
        
        aggregate(field, operation = 'sum') {
            if (!this.data.length) return 0;
            
            const values = this.data.map(item => parseFloat(item[field]) || 0);
            
            switch(operation.toLowerCase()) {
                case 'sum':
                    return values.reduce((a, b) => a + b, 0);
                case 'avg':
                    return values.reduce((a, b) => a + b, 0) / values.length;
                case 'min':
                    return Math.min(...values);
                case 'max':
                    return Math.max(...values);
                case 'count':
                    return values.length;
                default:
                    throw new Error(`Operação não suportada: ${operation}`);
            }
        }
        
        // Métodos de agrupamento
        groupBy(field) {
            if (!this.data.length) return {};
            
            return this.data.reduce((groups, item) => {
                const key = item[field] || 'N/A';
                if (!groups[key]) groups[key] = [];
                groups[key].push(item);
                return groups;
            }, {});
        }
        
        pivot(rowField, colField, valueField, operation = 'sum') {
            const groups = this.groupBy(rowField);
            const result = {};
            
            Object.entries(groups).forEach(([rowKey, items]) => {
                const colGroups = items.reduce((cols, item) => {
                    const colKey = item[colField] || 'N/A';
                    const value = parseFloat(item[valueField]) || 0;
                    
                    if (!cols[colKey]) cols[colKey] = [];
                    cols[colKey].push(value);
                    return cols;
                }, {});
                
                result[rowKey] = {};
                Object.entries(colGroups).forEach(([colKey, values]) => {
                    switch(operation) {
                        case 'sum':
                            result[rowKey][colKey] = values.reduce((a, b) => a + b, 0);
                            break;
                        case 'avg':
                            result[rowKey][colKey] = values.reduce((a, b) => a + b, 0) / values.length;
                            break;
                        case 'count':
                            result[rowKey][colKey] = values.length;
                            break;
                    }
                });
            });
            
            return result;
        }
        
        // Métodos de visualização
        render(template = null) {
            if (template && typeof template === 'function') {
                const html = template(this.data);
                this.$element.html(html);
            } else {
                this.renderDefault();
            }
            
            this.$element.trigger('jflow:rendered');
        }
        
        renderDefault() {
            if (!this.data.length) {
                this.$element.html('<div class="jflow-empty">Nenhum dado disponível</div>');
                return;
            }
            
            const headers = Object.keys(this.data[0]);
            const rows = this.data.map(item => 
                `<tr>${headers.map(header => 
                    `<td>${this.escapeHtml(String(item[header] || ''))}</td>`
                ).join('')}</tr>`
            ).join('');
            
            const table = `
                <table class="jflow-table">
                    <thead>
                        <tr>${headers.map(header => 
                            `<th>${this.escapeHtml(header)}</th>`
                        ).join('')}</tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            `;
            
            this.$element.html(table);
        }
        
        // Métodos de exportação
        export(format = 'json') {
            let output;
            
            switch(format.toLowerCase()) {
                case 'json':
                    output = JSON.stringify(this.data, null, 2);
                    break;
                case 'csv':
                    output = this.toCSV();
                    break;
                case 'xml':
                    output = this.toXML();
                    break;
                default:
                    throw new Error(`Formato de exportação não suportado: ${format}`);
            }
            
            this.$element.trigger('jflow:exported', [format, output]);
            return output;
        }
        
        toCSV() {
            if (!this.data.length) return '';
            
            const headers = Object.keys(this.data[0]);
            const csvRows = [
                headers.join(','),
                ...this.data.map(row => 
                    headers.map(header => 
                        `"${String(row[header] || '').replace(/"/g, '""')}"`
                    ).join(',')
                )
            ];
            
            return csvRows.join('\n');
        }
        
        toXML() {
            if (!this.data.length) return '<?xml version="1.0" encoding="UTF-8"?><data></data>';
            
            const items = this.data.map(item => {
                const fields = Object.entries(item).map(([key, value]) => 
                    `<${key}>${this.escapeXml(String(value || ''))}</${key}>`
                ).join('');
                return `<item>${fields}</item>`;
            }).join('');
            
            return `<?xml version="1.0" encoding="UTF-8"?><data>${items}</data>`;
        }
        
        // Métodos de utilidade
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        escapeXml(text) {
            return text.replace(/[<>&'"]/g, c => {
                switch(c) {
                    case '<': return '&lt;';
                    case '>': return '&gt;';
                    case '&': return '&amp;';
                    case "'": return '&apos;';
                    case '"': return '&quot;';
                    default: return c;
                }
            });
        }
        
        // Métodos de log
        log(...args) {
            if (this.options.debug) {
                console.log('[JFlow]', ...args);
            }
        }
        
        warn(...args) {
            console.warn('[JFlow]', ...args);
        }
        
        error(...args) {
            console.error('[JFlow]', ...args);
        }
        
        // Métodos de evento
        on(event, handler) {
            if (!this.listeners[event]) this.listeners[event] = [];
            this.listeners[event].push(handler);
            this.$element.on(`jflow:${event}`, handler);
        }
        
        off(event, handler) {
            this.$element.off(`jflow:${event}`, handler);
        }
        
        // Métodos de gerenciamento de estado
        getState() {
            return {
                data: this.data,
                filters: this.filters,
                transformations: this.transformations.length
            };
        }
        
        clear() {
            this.data = [];
            this.filters = {};
            this.transformations = [];
            this.$element.trigger('jflow:cleared');
            this.render();
        }
        
        // Métodos de compatibilidade
        static setDefaults(options) {
            $.extend(JFLOW_CONFIG, options);
        }
        
        static getVersion() {
            return JFLOW_CONFIG.version;
        }
    }
    
    // Plugin jQuery
    $.fn.jFlow = function(options) {
        return this.each(function() {
            if (!$.data(this, 'jflow')) {
                $.data(this, 'jflow', new JFlow(this, options));
            }
            return $.data(this, 'jflow');
        });
    };
    
    // Métodos estáticos
    $.jFlow = {
        version: JFLOW_CONFIG.version,
        config: JFLOW_CONFIG,
        
        createDataSource(url, options = {}) {
            return {
                url: url,
                options: options,
                async fetch() {
                    try {
                        const response = await fetch(this.url, this.options);
                        if (!response.ok) throw new Error(`HTTP ${response.status}`);
                        return await response.json();
                    } catch (error) {
                        console.error('Erro ao buscar dados:', error);
                        throw error;
                    }
                }
            };
        },
        
        formatNumber(value, options = {}) {
            const defaults = {
                style: 'decimal',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            };
            
            const formatter = new Intl.NumberFormat('pt-BR', { ...defaults, ...options });
            return formatter.format(value);
        },
        
        formatDate(date, format = 'DD/MM/YYYY') {
            const d = new Date(date);
            const day = d.getDate().toString().padStart(2, '0');
            const month = (d.getMonth() + 1).toString().padStart(2, '0');
            const year = d.getFullYear();
            
            switch(format) {
                case 'DD/MM/YYYY':
                    return `${day}/${month}/${year}`;
                case 'YYYY-MM-DD':
                    return `${year}-${month}-${day}`;
                case 'MM/DD/YYYY':
                    return `${month}/${day}/${year}`;
                default:
                    return d.toLocaleDateString();
            }
        },
        
        createChart(element, data, options = {}) {
            const defaults = {
                type: 'line',
                responsive: true,
                maintainAspectRatio: false
            };
            
            return new Chart(element, {
                type: options.type || defaults.type,
                data: data,
                options: { ...defaults, ...options }
            });
        }
    };
    
    // Inicialização automática
    $(document).ready(function() {
        $('[data-jflow]').each(function() {
            const options = $(this).data('jflow-options');
            $(this).jFlow(options);
        });
    });
    
})(jQuery, window, document);

// Exemplo de uso:
/*
// 1. Inicialização básica
$('#meuContainer').jFlow();

// 2. Carregar dados
$('#meuContainer').jFlow().load([
    { nome: 'João', idade: 25, cidade: 'SP' },
    { nome: 'Maria', idade: 30, cidade: 'RJ' }
]);

// 3. Aplicar filtro
$('#meuContainer').jFlow().filter({ cidade: 'SP' });

// 4. Transformar dados
$('#meuContainer').jFlow().transform(data => 
    data.map(item => ({ ...item, idadeDobrada: item.idade * 2 }))
);

// 5. Exportar
const jsonData = $('#meuContainer').jFlow().export('json');

// 6. Eventos
$('#meuContainer').jFlow().on('dataLoaded', (e, data) => {
    console.log('Dados carregados:', data);
});
*/
