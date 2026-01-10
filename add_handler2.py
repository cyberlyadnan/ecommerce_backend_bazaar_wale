#!/usr/bin/env python3

# Read the file
with open('src/controllers/order.controller.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Handler code to insert
handler_lines = [
    '\n',
    '/**\n',
    ' * Cancel payment (when customer closes payment modal)\n',
    ' * POST /api/orders/:orderId/cancel-payment\n',
    ' * Fixed: This handler was missing, causing "argument handler must be a function" error\n',
    ' */\n',
    'export const cancelPaymentHandler = async (\n',
    '  req: Request,\n',
    '  res: Response,\n',
    '  next: NextFunction,\n',
    ') => {\n',
    '  try {\n',
    '    if (!req.user) {\n',
    '      throw new ApiError(401, \'Authentication required\');\n',
    '    }\n',
    '\n',
    '    const { orderId } = req.params;\n',
    '    const Order = (await import(\'../models/Order.model\')).default;\n',
    '\n',
    '    // Find order by ID and verify it belongs to the user\n',
    '    const order = await Order.findOne({\n',
    '      _id: orderId,\n',
    '      userId: req.user._id,\n',
    '      isDeleted: false,\n',
    '    });\n',
    '\n',
    '    if (!order) {\n',
    '      throw new ApiError(404, \'Order not found\');\n',
    '    }\n',
    '\n',
    '    // Only cancel if payment is still pending\n',
    '    if (order.paymentStatus === \'pending\') {\n',
    '      order.paymentStatus = \'cancelled\';\n',
    '      order.status = \'cancelled\';\n',
    '      await order.save();\n',
    '    }\n',
    '\n',
    '    res.json({\n',
    '      success: true,\n',
    '      order: order.toObject(),\n',
    '      message: \'Payment cancelled successfully\',\n',
    '    });\n',
    '  } catch (error) {\n',
    '    next(error);\n',
    '  }\n',
    '};\n',
    '\n',
]

# Find the insertion point (after line with "};" before "Razorpay webhook handler")
insert_idx = None
for i in range(len(lines) - 1):
    if lines[i].strip() == '};' and 'Razorpay webhook handler' in lines[i+2]:
        insert_idx = i + 1
        break

if insert_idx is None:
    print("Could not find insertion point")
    exit(1)

# Insert the handler
new_lines = lines[:insert_idx] + handler_lines + lines[insert_idx:]

# Write back
with open('src/controllers/order.controller.ts', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"Handler added successfully at line {insert_idx + 1}!")
