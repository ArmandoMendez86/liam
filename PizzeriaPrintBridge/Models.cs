// /PizzeriaPrintBridge/Models.cs
using System.Text.Json.Serialization;

namespace PizzeriaPrintBridge;

// --- Estructura principal que recibimos de PHP ---
public class OrderData
{
    [JsonPropertyName("order_id")]
    public int OrderId { get; set; }

    [JsonPropertyName("subtotal")]
    public float Subtotal { get; set; }

    [JsonPropertyName("discount_amount")]
    public float DiscountAmount { get; set; }

    [JsonPropertyName("total")]
    public float Total { get; set; }

    [JsonPropertyName("service_type")]
    public string ServiceType { get; set; } = "TO_GO";

    [JsonPropertyName("items")]
    public List<OrderItem> Items { get; set; } = new();

    // --- NUEVA PROPIEDAD ---
    // Esto captura el "print_type: 'COCINA'" que envía JS
    [JsonPropertyName("print_type")]
    public string PrintType { get; set; } = "VENTA"; // VENTA por defecto

    [JsonPropertyName("order_date")]
    public string? OrderDate { get; set; }
}

// --- Estructura de cada ítem en la orden ---
public class OrderItem
{
    [JsonPropertyName("product_id")]
    public int ProductId { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = "";

    [JsonPropertyName("quantity")]
    public int Quantity { get; set; }

    [JsonPropertyName("price")]
    public float Price { get; set; }

    [JsonPropertyName("variant_name")]
    public string VariantName { get; set; } = "";

    // --- ESTRUCTURA DE EXTRAS CORREGIDA ---
    // JS envía una lista de objetos, no de strings
    [JsonPropertyName("extras")]
    public List<ExtraItem> Extras { get; set; } = new();

    [JsonPropertyName("is_split")]
    public bool IsSplit { get; set; }

    [JsonPropertyName("split_details")]
    public object? SplitDetails { get; set; } // Lo ignoramos, el 'name' ya viene formateado
}

// --- NUEVA CLASE PARA EXTRAS ---
// Esto nos permite leer la cantidad y nombre del extra
public class ExtraItem
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = "";

    [JsonPropertyName("quantity")]
    public int Quantity { get; set; }

    [JsonPropertyName("price")]
    public float Price { get; set; }
}