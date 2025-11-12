// /PizzeriaPrintBridge/PrinterService.cs
using System.Drawing;
using System.Drawing.Printing;

namespace PizzeriaPrintBridge;

public interface IPrinterService
{
    // ¡Recuerda cambiar esto por tu impresora real!
    const string PRINTER_NAME = "POS-80"; 

    void Print(OrderData order);
}

public class WindowsPrinterService : IPrinterService
{
    // ##################################################################
    // ###               CONFIGURACIÓN DE DISEÑO                    ###
    // ##################################################################
    //
    // ¡Ajusta estos valores para tu impresora!
    //
    // 1. SELECCIONA TU PAPEL (esto cargará los anchos de columna predefinidos):
    private const int PAPER_WIDTH_MM = 80; // <--- CAMBIA ESTO A 58 O 80

    // 2. DEFINE LOS ANCHOS DE COLUMNA (en píxeles)
    //    (Puedes experimentar hasta que se vea bien)

    // --- Configuración para 80mm ---
    private const int COL_QTY_WIDTH_80MM = 40;   // Ancho para "Cant."
    private const int COL_TOTAL_WIDTH_80MM = 70; // Ancho para "$Total"

    // --- Configuración para 58mm ---
    private const int COL_QTY_WIDTH_58MM = 30;   // Ancho para "Cant."
    private const int COL_TOTAL_WIDTH_58MM = 55; // Ancho para "$Total"

    // 3. MÁRGENES
    private const int MARGIN_LEFT = 5;
    private const int MARGIN_RIGHT = 5;

    // ##################################################################

    // Fuentes (puedes ajustarlas)
    private Font _titleFont = new("Arial", 12, FontStyle.Bold);
    private Font _bodyFont = new("Arial", 9);
    private Font _smallFont = new("Arial", 8, FontStyle.Italic); // Para los extras
    private Brush _brush = Brushes.Black;
    private OrderData? _currentOrder; 

    public void Print(OrderData order)
    {
        _currentOrder = order;

        try
        {
            PrintDocument pd = new();
            pd.PrinterSettings.PrinterName = IPrinterService.PRINTER_NAME;
            pd.PrintPage += new PrintPageEventHandler(FormatPrintPage);
            pd.Print();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error al imprimir: {ex.Message}");
            throw new Exception($"Error al iniciar impresión: {ex.Message}. Revisa el nombre de la impresora.");
        }
    }

    /// <summary>
    /// Aquí es donde "dibujamos" el ticket.
    /// </summary>
    private void FormatPrintPage(object sender, PrintPageEventArgs e)
    {
        if (_currentOrder == null || e.Graphics == null) return;
        
        Graphics g = e.Graphics;

        // --- 1. Cargar configuración de columnas ---
        int colQtyWidth = (PAPER_WIDTH_MM == 58) ? COL_QTY_WIDTH_58MM : COL_QTY_WIDTH_80MM;
        int colTotalWidth = (PAPER_WIDTH_MM == 58) ? COL_TOTAL_WIDTH_58MM : COL_TOTAL_WIDTH_80MM;

        // --- 2. Definir Área de Impresión y Coordenadas ---
        float totalWidth = e.PageSettings.PaperSize.Width;
        float printableWidth = totalWidth - MARGIN_LEFT - MARGIN_RIGHT;
        float y = 10; // Posición Y actual

        // Definir las posiciones X (horizontales) de cada columna
        float xQty = MARGIN_LEFT;
        float xDesc = MARGIN_LEFT + colQtyWidth;
        
        // El ancho de la descripción es el espacio que queda en medio
        float descWidth = printableWidth - colQtyWidth - colTotalWidth;
        
        // La columna de total empieza donde termina la de descripción
        float xTotal = xDesc + descWidth;

        // --- 3. Definir Formatos de Alineación ---
        StringFormat alignLeft = new StringFormat { Alignment = StringAlignment.Near };
        StringFormat alignCenter = new StringFormat { Alignment = StringAlignment.Center };
        StringFormat alignRight = new StringFormat { Alignment = StringAlignment.Far };

        // --- 4. Determinar Tipo de Ticket ---
        bool isKitchenTicket = (_currentOrder.PrintType == "COCINA");

        
        // --- 5. DIBUJAR ENCABEZADO ---
        string ticketTitle = isKitchenTicket ? "--- COCINA ---" : "Ticket de Venta";
        RectangleF rectTitle = new RectangleF(MARGIN_LEFT, y, printableWidth, 20);
        g.DrawString(ticketTitle, _titleFont, _brush, rectTitle, alignCenter);
        y += 30;

        RectangleF rectLogo = new RectangleF(MARGIN_LEFT, y, printableWidth, 20);
        g.DrawString("PIZZERIA 'LIAM'", _titleFont, _brush, rectLogo, alignCenter);
        y += 30;

        // --- 6. DIBUJAR DATOS DE LA ORDEN (Esta parte se mantiene) ---
        string serviceTypeDisplay = _currentOrder.ServiceType;
        if (serviceTypeDisplay == "TO_GO") serviceTypeDisplay = "Para Llevar";
        if (serviceTypeDisplay == "DINE_IN") serviceTypeDisplay = "Comer Aquí";

        g.DrawString($"Orden: #{_currentOrder.OrderId}", _bodyFont, _brush, MARGIN_LEFT, y);
        // Usamos 'printableWidth' para alinear el tipo a la derecha
        g.DrawString($"Tipo: {serviceTypeDisplay}", _bodyFont, _brush, new RectangleF(MARGIN_LEFT, y, printableWidth, 20), alignRight);
        y += 20;

        string fechaParaImprimir;
        
        // Si 'OrderDate' está vacía (es una venta NUEVA), usamos la hora actual.
        if (string.IsNullOrEmpty(_currentOrder.OrderDate))
        {
            fechaParaImprimir = DateTime.Now.ToString("dd/MM/yyyy HH:mm");
        }
        else
        {
            // Si 'OrderDate' SÍ tiene un valor (es REIMPRESIÓN o CIERRE), la usamos.
            // La fecha de SQLite es "YYYY-MM-DD HH:MM:SS". La parseamos para reformatearla.
            if (DateTime.TryParse(_currentOrder.OrderDate, out DateTime originalDate))
            {
                fechaParaImprimir = originalDate.ToString("dd/MM/yyyy HH:mm");
            }
            else
            {
                // Si falla el parseo, solo la imprimimos tal cual
                fechaParaImprimir = _currentOrder.OrderDate;
            }
        }
        
        g.DrawString(fechaParaImprimir, _bodyFont, _brush, MARGIN_LEFT, y);
        y += 20;
        g.DrawString(new string('-', 50), _bodyFont, _brush, new RectangleF(MARGIN_LEFT, y, printableWidth, 20), alignCenter);
        y += 20;

        // --- 7. DIBUJAR ENCABEZADO DE ITEMS (con Rectángulos) ---
        g.DrawString("Cant.", _bodyFont, _brush, new RectangleF(xQty, y, colQtyWidth, 20), alignLeft);
        g.DrawString("Descripción", _bodyFont, _brush, new RectangleF(xDesc, y, descWidth, 20), alignLeft);
        if (!isKitchenTicket)
        {
            g.DrawString("Total", _bodyFont, _brush, new RectangleF(xTotal, y, colTotalWidth, 20), alignRight);
        }
        y += 15;


        // --- 8. DIBUJAR ITEMS (con Rectángulos) ---
        foreach (var item in _currentOrder.Items)
        {
            float startY_Item = y; // Guardamos la Y inicial del ítem

            // Formatear el nombre (Ej. "Pizza Hawaiana (Grande)")
            string name = item.Name;
            if (!string.IsNullOrEmpty(item.VariantName))
            {
                name += $" ({item.VariantName})";
            }

            // --- Calcular Altura ---
            // Medimos cuánto espacio vertical ocupará la descripción (con auto-wrap)
            SizeF descSize = g.MeasureString(name, _bodyFont, (int)descWidth);
            float itemHeight = descSize.Height; // La altura base del ítem

            // --- Dibujar Columnas ---
            // Cantidad
            g.DrawString(item.Quantity.ToString(), _bodyFont, _brush, new RectangleF(xQty, y, colQtyWidth, itemHeight), alignLeft);
            
            // Descripción (con auto-wrap)
            g.DrawString(name, _bodyFont, _brush, new RectangleF(xDesc, y, descWidth, itemHeight), alignLeft);

            // Total (si aplica)
            if (!isKitchenTicket)
            {
                float itemTotal = item.Quantity * item.Price;
                g.DrawString($"${itemTotal:N2}", _bodyFont, _brush, new RectangleF(xTotal, y, colTotalWidth, itemHeight), alignRight);
            }
            
            // Avanzamos 'y' por la altura de la descripción
            y += itemHeight;

            // --- LÓGICA DE EXTRAS (Debajo del ítem) ---
            if (item.Extras != null && item.Extras.Count > 0)
            {
                foreach (var extra in item.Extras)
                {
                    string extraLine = $"  + {extra.Quantity} {extra.Name}";
                    // Medimos y dibujamos los extras, indentados
                    SizeF extraSize = g.MeasureString(extraLine, _smallFont, (int)descWidth - 10);
                    g.DrawString(extraLine, _smallFont, _brush, new RectangleF(xDesc + 10, y, descWidth - 10, extraSize.Height), alignLeft);
                    y += extraSize.Height; // Avanzamos 'y' por cada extra
                }
            }
            
            y += 5; // Añadir un pequeño espacio después de cada ítem
        }

        // --- 9. DIBUJAR TOTALES Y PIE DE PÁGINA ---
        g.DrawString(new string('-', 50), _bodyFont, _brush, new RectangleF(MARGIN_LEFT, y, printableWidth, 20), alignCenter);
        y += 20;

        if (isKitchenTicket)
        {
            // Pie de página para COCINA
            g.DrawString("--- FIN DE COMANDA ---", _titleFont, _brush, new RectangleF(MARGIN_LEFT, y, printableWidth, 20), alignCenter);
        }
        else
        {
            // Definir columnas para los totales (Etiqueta a la derecha, Valor a la derecha)
            float xTotalLabel = MARGIN_LEFT;
            float totalLabelWidth = printableWidth - colTotalWidth - 5; // El espacio restante
            float xTotalValue = xTotalLabel + totalLabelWidth;

            // Subtotal
            g.DrawString("Subtotal:", _bodyFont, _brush, new RectangleF(xTotalLabel, y, totalLabelWidth, 20), alignRight);
            g.DrawString($"${_currentOrder.Subtotal:N2}", _bodyFont, _brush, new RectangleF(xTotalValue, y, colTotalWidth, 20), alignRight);
            y += 20;

            // Descuento
            g.DrawString("Descuento:", _bodyFont, _brush, new RectangleF(xTotalLabel, y, totalLabelWidth, 20), alignRight);
            g.DrawString($"${_currentOrder.DiscountAmount:N2}", _bodyFont, _brush, new RectangleF(xTotalValue, y, colTotalWidth, 20), alignRight);
            y += 20;

            // TOTAL
            g.DrawString("TOTAL:", _titleFont, _brush, new RectangleF(xTotalLabel, y, totalLabelWidth, 20), alignRight);
            g.DrawString($"${_currentOrder.Total:N2}", _titleFont, _brush, new RectangleF(xTotalValue, y, colTotalWidth, 20), alignRight);
            y += 30;

            // Pie de página para VENTA
            g.DrawString("¡Gracias por su compra!", _smallFont, _brush, new RectangleF(MARGIN_LEFT, y, printableWidth, 20), alignCenter);
        }

        e.HasMorePages = false;
    }
}