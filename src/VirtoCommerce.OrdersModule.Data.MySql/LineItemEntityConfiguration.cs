using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VirtoCommerce.OrdersModule.Data.Model;

namespace VirtoCommerce.OrdersModule.Data.MySql
{
    public class LineItemEntityConfiguration : IEntityTypeConfiguration<LineItemEntity>
    {
        public void Configure(EntityTypeBuilder<LineItemEntity> builder)
        {
            builder.Property(x => x.Price).HasColumnType("decimal").HasPrecision(18, 4);
            builder.Property(x => x.PriceWithTax).HasColumnType("decimal").HasPrecision(18, 4);
            builder.Property(x => x.DiscountAmount).HasColumnType("decimal").HasPrecision(18, 4);
            builder.Property(x => x.DiscountAmountWithTax).HasColumnType("decimal").HasPrecision(18, 4);
            builder.Property(x => x.Fee).HasColumnType("decimal").HasPrecision(18, 4);
            builder.Property(x => x.FeeWithTax).HasColumnType("decimal").HasPrecision(18, 4);
            builder.Property(x => x.TaxTotal).HasColumnType("decimal").HasPrecision(18, 4);
        }
    }
}
