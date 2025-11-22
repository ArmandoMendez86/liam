// /PizzeriaPrintBridge/PrinterService.cs
using System.Drawing;
using System.Drawing.Printing;

namespace PizzeriaPrintBridge;

public interface IPrinterService
{
    const string PRINTER_NAME = "POS-58"; 
    void Print(OrderData order);
}

public class WindowsPrinterService : IPrinterService
{
    // --- CONFIGURACIÓN ---
    private const int PAPER_WIDTH_MM = 58; 

    // Ajustes para 58mm (Área segura 48mm)
    private const int COL_QTY_WIDTH_58MM = 22;   
    private const int COL_TOTAL_WIDTH_58MM = 45; 
    private const int COL_QTY_WIDTH_80MM = 40;
    private const int COL_TOTAL_WIDTH_80MM = 70;

    private const int MARGIN_LEFT = 0; 
    private const int MARGIN_RIGHT = 0;

    private Font _titleFont;
    private Font _bodyFont;
    private Font _smallFont;
    private Font _totalLabelFont; 
    private Brush _brush = Brushes.Black;
    private OrderData? _currentOrder; 

    public void Print(OrderData order)
    {
        _currentOrder = order;
        
        // Configurar fuentes según papel
        if (PAPER_WIDTH_MM == 58)
        {
            _titleFont = new Font("Arial", 8, FontStyle.Bold);      
            _bodyFont = new Font("Arial", 7, FontStyle.Regular);    
            _smallFont = new Font("Arial", 6, FontStyle.Italic);    
            _totalLabelFont = new Font("Arial", 7, FontStyle.Bold); 
        }
        else
        {
            _titleFont = new Font("Arial", 11, FontStyle.Bold);
            _bodyFont = new Font("Arial", 9, FontStyle.Regular);
            _smallFont = new Font("Arial", 8, FontStyle.Italic);
            _totalLabelFont = new Font("Arial", 9, FontStyle.Bold);
        }

        try
        {
            PrintDocument pd = new();
            pd.PrinterSettings.PrinterName = IPrinterService.PRINTER_NAME;
            
            // DETECTAR TIPO DE IMPRESIÓN
            if (_currentOrder.PrintType == "CORTE")
            {
                pd.PrintPage += new PrintPageEventHandler(PrintCutPage);
            }
            else
            {
                pd.PrintPage += new PrintPageEventHandler(FormatPrintPage);
            }
            
            pd.Print();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error: {ex.Message}");
            throw new Exception($"Error impresión: {ex.Message}");
        }
    }

    // =========================================================
    //  DISEÑO DEL TICKET NORMAL (VENTA / COCINA)
    // =========================================================
    private void FormatPrintPage(object sender, PrintPageEventArgs e)
    {
        if (_currentOrder == null || e.Graphics == null) return;
        Graphics g = e.Graphics;

        float safeWidthMM = (PAPER_WIDTH_MM == 58) ? 48f : 72f;
        float simulatedPaperWidth = (safeWidthMM / 25.4f) * 100;
        float printableWidth = simulatedPaperWidth - MARGIN_LEFT - MARGIN_RIGHT;
        float y = 5; 

        int colQtyWidth = (PAPER_WIDTH_MM == 58) ? COL_QTY_WIDTH_58MM : COL_QTY_WIDTH_80MM;
        int colTotalWidth = (PAPER_WIDTH_MM == 58) ? COL_TOTAL_WIDTH_58MM : COL_TOTAL_WIDTH_80MM;
        float xQty = MARGIN_LEFT;
        float xDesc = MARGIN_LEFT + colQtyWidth;
        float descWidth = printableWidth - colQtyWidth - colTotalWidth; 
        float xTotal = xDesc + descWidth;

        StringFormat alignCenter = new StringFormat { Alignment = StringAlignment.Center };
        StringFormat alignRight = new StringFormat { Alignment = StringAlignment.Far };
        StringFormat alignLeft = new StringFormat { Alignment = StringAlignment.Near };

        bool isKitchen = (_currentOrder.PrintType == "COCINA");

        // Título
        string title = isKitchen ? "--- COCINA ---" : "TICKET DE VENTA";
        g.DrawString(title, _titleFont, _brush, new RectangleF(MARGIN_LEFT, y, printableWidth, 15), alignCenter);
        y += 15;
        g.DrawString("PIZZERIA 'LIAM'", _titleFont, _brush, new RectangleF(MARGIN_LEFT, y, printableWidth, 15), alignCenter);
        y += 20;

        // Info Orden
        g.DrawString($"Orden: #{_currentOrder.OrderId}", _bodyFont, _brush, MARGIN_LEFT, y);
        string serv = _currentOrder.ServiceType == "DINE_IN" ? "Comer Aquí" : "Para Llevar";
        g.DrawString(serv, _bodyFont, _brush, new RectangleF(MARGIN_LEFT, y, printableWidth, 15), alignRight);
        y += 12;

        // Fecha
        string fecha = DateTime.Now.ToString("dd/MM/yy HH:mm");
        if(!string.IsNullOrEmpty(_currentOrder.OrderDate) && DateTime.TryParse(_currentOrder.OrderDate, out DateTime dt)) fecha = dt.ToString("dd/MM/yy HH:mm");
        g.DrawString(fecha, _bodyFont, _brush, MARGIN_LEFT, y);
        y += 15;
        g.DrawString(new string('-', 40), _bodyFont, _brush, new RectangleF(MARGIN_LEFT, y, printableWidth, 10), alignCenter);
        y += 10;

        // Items
        g.DrawString("Cant", _totalLabelFont, _brush, new RectangleF(xQty, y, colQtyWidth, 15), alignLeft);
        g.DrawString("Descrip.", _totalLabelFont, _brush, new RectangleF(xDesc, y, descWidth, 15), alignLeft);
        if(!isKitchen) g.DrawString("Total", _totalLabelFont, _brush, new RectangleF(xTotal, y, colTotalWidth, 15), alignRight);
        y += 15;

        foreach (var item in _currentOrder.Items)
        {
            string name = item.Name + (!string.IsNullOrEmpty(item.VariantName) ? $" ({item.VariantName})" : "");
            SizeF size = g.MeasureString(name, _bodyFont, (int)descWidth);
            float h = Math.Max(15, size.Height);

            g.DrawString(item.Quantity.ToString(), _bodyFont, _brush, new RectangleF(xQty, y, colQtyWidth, h), alignLeft);
            g.DrawString(name, _bodyFont, _brush, new RectangleF(xDesc, y, descWidth, h), alignLeft);
            if(!isKitchen) g.DrawString($"{(item.Quantity*item.Price):0.00}", _bodyFont, _brush, new RectangleF(xTotal, y, colTotalWidth, h), alignRight);
            y += h;

            if(item.Extras != null) {
                foreach(var ex in item.Extras) {
                   string exTxt = $"+{ex.Quantity} {ex.Name}";
                   SizeF exSize = g.MeasureString(exTxt, _smallFont, (int)descWidth);
                   g.DrawString(exTxt, _smallFont, _brush, new RectangleF(xDesc+2, y, descWidth, exSize.Height), alignLeft);
                   y += exSize.Height;
                }
            }
            y += 2;
        }

        g.DrawString(new string('-', 40), _bodyFont, _brush, new RectangleF(MARGIN_LEFT, y, printableWidth, 10), alignCenter);
        y += 10;

        // Totales
        if(isKitchen) {
             g.DrawString("--- FIN ---", _titleFont, _brush, new RectangleF(MARGIN_LEFT, y, printableWidth, 20), alignCenter);
        } else {
            float lblW = 55; float valW = 75; float startX = printableWidth - lblW - valW;
            
            g.DrawString("Subtotal:", _bodyFont, _brush, new RectangleF(startX, y, lblW, 15), alignRight);
            g.DrawString($"${_currentOrder.Subtotal:0.00}", _bodyFont, _brush, new RectangleF(startX+lblW, y, valW, 15), alignRight);
            y += 15;

            if(_currentOrder.DiscountAmount > 0) {
                g.DrawString("Desc:", _bodyFont, _brush, new RectangleF(startX, y, lblW, 15), alignRight);
                g.DrawString($"-${_currentOrder.DiscountAmount:0.00}", _bodyFont, _brush, new RectangleF(startX+lblW, y, valW, 15), alignRight);
                y += 15;
            }

            g.DrawString("TOTAL:", _titleFont, _brush, new RectangleF(startX, y, lblW, 20), alignRight);
            g.DrawString($"${_currentOrder.Total:0.00}", _titleFont, _brush, new RectangleF(startX+lblW, y, valW, 20), alignRight);
            y += 30;
            g.DrawString("¡Gracias por su compra!", _smallFont, _brush, new RectangleF(MARGIN_LEFT, y, printableWidth, 15), alignCenter);
        }
        e.HasMorePages = false;
    }

    // =========================================================
    //  NUEVO: DISEÑO DEL CORTE DE CAJA
    // =========================================================
    private void PrintCutPage(object sender, PrintPageEventArgs e)
    {
        if (_currentOrder == null || e.Graphics == null) return;
        Graphics g = e.Graphics;

        float safeWidthMM = (PAPER_WIDTH_MM == 58) ? 48f : 72f;
        float simulatedPaperWidth = (safeWidthMM / 25.4f) * 100;
        float printableWidth = simulatedPaperWidth - MARGIN_LEFT - MARGIN_RIGHT;
        float y = 5;

        StringFormat alignCenter = new StringFormat { Alignment = StringAlignment.Center };
        StringFormat alignLeft = new StringFormat { Alignment = StringAlignment.Near };
        StringFormat alignRight = new StringFormat { Alignment = StringAlignment.Far };

        // 1. ENCABEZADO
        g.DrawString("=== CORTE DE CAJA ===", _titleFont, _brush, new RectangleF(MARGIN_LEFT, y, printableWidth, 20), alignCenter);
        y += 20;
        g.DrawString("PIZZERIA 'LIAM'", _bodyFont, _brush, new RectangleF(MARGIN_LEFT, y, printableWidth, 15), alignCenter);
        y += 20;
        g.DrawString($"Fecha Impresión: {DateTime.Now:dd/MM/yy HH:mm}", _smallFont, _brush, MARGIN_LEFT, y);
        y += 15;
        
        // El campo OrderDate en este caso trae el rango de fechas (ej: "2023-10-01 al 2023-10-01")
        g.DrawString($"Periodo: {_currentOrder.OrderDate}", _bodyFont, _brush, MARGIN_LEFT, y);
        y += 15;

        g.DrawString(new string('=', 40), _bodyFont, _brush, new RectangleF(MARGIN_LEFT, y, printableWidth, 10), alignCenter);
        y += 15;

        // 2. RESUMEN FINANCIERO
        // Alineación manual
        float labelW = printableWidth * 0.6f;
        float valW = printableWidth * 0.4f;

        // Subtotal
        g.DrawString("Ventas Brutas:", _bodyFont, _brush, new RectangleF(MARGIN_LEFT, y, labelW, 15), alignLeft);
        g.DrawString($"${_currentOrder.Subtotal:0.00}", _bodyFont, _brush, new RectangleF(MARGIN_LEFT + labelW, y, valW, 15), alignRight);
        y += 15;

        // Descuentos
        g.DrawString("Descuentos:", _bodyFont, _brush, new RectangleF(MARGIN_LEFT, y, labelW, 15), alignLeft);
        g.DrawString($"-${_currentOrder.DiscountAmount:0.00}", _bodyFont, _brush, new RectangleF(MARGIN_LEFT + labelW, y, valW, 15), alignRight);
        y += 15;

        g.DrawString(new string('-', 40), _bodyFont, _brush, new RectangleF(MARGIN_LEFT, y, printableWidth, 10), alignCenter);
        y += 10;

        // TOTAL NETO
        g.DrawString("VENTA TOTAL:", _titleFont, _brush, new RectangleF(MARGIN_LEFT, y, labelW, 20), alignLeft);
        g.DrawString($"${_currentOrder.Total:0.00}", _titleFont, _brush, new RectangleF(MARGIN_LEFT + labelW, y, valW, 20), alignRight);
        y += 25;

        // 3. ESTADÍSTICAS EXTRA (Usamos la lista de Items para pasar datos extra si los hay)
        if (_currentOrder.Items != null && _currentOrder.Items.Count > 0)
        {
            foreach(var stat in _currentOrder.Items)
            {
                // Usamos el campo 'Name' como etiqueta y 'Quantity' como valor numérico
                g.DrawString(stat.Name + ":", _bodyFont, _brush, new RectangleF(MARGIN_LEFT, y, labelW, 15), alignLeft);
                g.DrawString(stat.Quantity.ToString(), _bodyFont, _brush, new RectangleF(MARGIN_LEFT + labelW, y, valW, 15), alignRight);
                y += 15;
            }
        }

        y += 20;
        g.DrawString("--- FIN DEL CORTE ---", _smallFont, _brush, new RectangleF(MARGIN_LEFT, y, printableWidth, 20), alignCenter);
        
        e.HasMorePages = false;
    }
}