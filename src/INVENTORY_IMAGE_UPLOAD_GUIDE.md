# Inventory Image Upload Guide

## Overview
The ProSpaces CRM now supports bulk image uploads for inventory items. This guide will help you extract images from your Excel workbook and upload them to the system.

## Step 1: Export Images from Excel

Since Excel embeds images differently depending on the version, here are multiple methods:

### Method 1: Using Excel's "Save as Web Page" Feature
1. Open your Excel workbook
2. Select the worksheet with images (Column A: SKU, Column C: Images)
3. File → Save As → Choose "Web Page (*.htm, *.html)"
4. Save it with a name like "inventory_export"
5. Navigate to the folder where you saved it
6. You'll find a folder named "inventory_export_files" containing all the images
7. Rename each image to match its SKU (e.g., `SKU123.jpg`, `ITEM-456.png`)

### Method 2: Using VBA (Excel Macro)
1. Press `Alt + F11` to open VBA Editor
2. Insert → Module
3. Paste this code:

```vba
Sub ExportImages()
    Dim ws As Worksheet
    Dim shp As Shape
    Dim pic As Picture
    Dim savePath As String
    Dim sku As String
    Dim row As Long
    
    ' Set your worksheet
    Set ws = ActiveSheet
    
    ' Create a folder to save images
    savePath = ThisWorkbook.Path & "\InventoryImages\"
    If Dir(savePath, vbDirectory) = "" Then
        MkDir savePath
    End If
    
    ' Loop through all shapes in column C
    For Each shp In ws.Shapes
        If shp.Type = msoPicture Or shp.Type = msoLinkedPicture Then
            ' Get the row number
            row = shp.TopLeftCell.row
            
            ' Get SKU from column A
            sku = ws.Cells(row, 1).Value
            
            ' Clean SKU for filename
            sku = Replace(sku, "/", "_")
            sku = Replace(sku, "\", "_")
            sku = Replace(sku, ":", "_")
            sku = Replace(sku, "*", "_")
            sku = Replace(sku, "?", "_")
            sku = Replace(sku, """", "_")
            sku = Replace(sku, "<", "_")
            sku = Replace(sku, ">", "_")
            sku = Replace(sku, "|", "_")
            
            ' Export the image
            If sku <> "" Then
                shp.Copy
                Set pic = ws.Pictures.Paste
                pic.ShapeRange.Export savePath & sku & ".jpg"
                pic.Delete
            End If
        End If
    Next shp
    
    MsgBox "Images exported to: " & savePath
End Sub
```

4. Press `F5` to run the macro
5. Images will be saved to a folder named "InventoryImages" with SKU as filenames

### Method 3: Manual Copy-Paste
1. Right-click on an image in Excel
2. Click "Save as Picture..."
3. Save with the SKU as the filename
4. Repeat for all images

## Step 2: Prepare Images

### Filename Format
The system automatically extracts SKU from filenames. Supported formats:
- `SKU123.jpg` → SKU: `SKU123`
- `ITEM-456.png` → SKU: `ITEM-456`
- `product_ABC789_image.jpg` → SKU: `ABC789`

The system removes common prefixes/suffixes like:
- `sku-`, `item-`, `product-`
- `-image`, `-img`, `-photo`, `-pic`

### Supported Image Formats
- JPG/JPEG
- PNG
- GIF
- WebP

### Image Size Recommendations
- Max file size: 5MB per image
- Recommended: 800x600 to 1200x900 pixels
- Keep files under 500KB for faster loading

## Step 3: Upload to ProSpaces CRM

1. **Login** to ProSpaces CRM admin dashboard
2. **Navigate** to Inventory → Bulk Image Upload tab
3. **Click** "Click to upload" or drag and drop your images
4. **Review** the SKU extraction for each file
5. **Click** "Upload X Image(s)"
6. **Wait** for the upload to complete
7. **Review** the results:
   - ✅ **Success**: Image uploaded and linked to inventory item
   - ❌ **Error**: No matching SKU found or upload failed

## Step 4: Verify Upload

1. Go to the "All Items" tab
2. Search for an item you uploaded an image for
3. Click the item to view details
4. The image should now appear in the item details

## Troubleshooting

### "No matching SKU found"
**Cause**: The SKU in the filename doesn't match any SKU in your inventory database.

**Solution**:
1. Check that the SKU in the filename exactly matches the SKU in Column A of your Excel
2. Ensure there are no extra spaces or special characters
3. Verify the inventory item exists in the system

### "Upload failed"
**Cause**: File too large, wrong format, or server error.

**Solution**:
1. Ensure image is under 5MB
2. Convert to JPG or PNG if it's in an unsupported format
3. Try uploading one image at a time to isolate the problem

### "Organization mismatch"
**Cause**: You're trying to upload to a different organization.

**Solution**:
1. Ensure you're logged in with the correct account
2. Contact your administrator if you need access

## Tips for Success

1. **Clean your data first**: Ensure all SKUs in Excel match your inventory system
2. **Test with one image**: Upload a single image first to verify the process works
3. **Batch by category**: Upload images in batches (e.g., by product category) for easier troubleshooting
4. **Keep originals**: Always keep a backup of your original images

## Advanced: CSV Import Alternative

If you prefer to import data + images via CSV:

1. Export your Excel to CSV (SKU, Name, Description, etc.)
2. Import the CSV data into inventory (without images)
3. Then use the bulk image upload to add images by SKU

This separates data import from image upload for better control.

## Need Help?

If you encounter issues:
1. Check the browser console for detailed error messages
2. Verify your network connection
3. Contact your system administrator
4. Provide the exact error message and SKU when reporting issues
