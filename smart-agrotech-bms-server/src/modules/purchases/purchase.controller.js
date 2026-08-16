import * as poService from './purchase.service.js';
import { createPOSchema } from './purchase.validation.js';

// export const handleCreatePO = async (req, res) => {
//   try {
//     const { error, value } = createPOSchema.validate(req.body);
//     if (error) return res.status(400).json({ success: false, message: error.details[0].message });

//     // Note: Assuming your global authentication middleware binds the active profile to req.user
//     const userId = req.user?._id || req.body.mockUserId; 
//     const purchaseOrder = await poService.createPurchaseOrder(value, userId);

//     return res.status(201).json({ success: true, data: purchaseOrder });
//   } catch (err) {
//     return res.status(500).json({ success: false, message: err.message });
//   }
// };

export const handleCreatePO = async (req, res, next) => {
  try {
    // 1. Initial Structural Request Zod Validation Run
    const validationResult = createPOSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        // Formats Zod errors into a clean human-readable list
        details: validationResult.error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      });
    }

    // 2. Extract Validated Payload Data
    const validatedData = validationResult.data;

    // 3. Extract Authenticated Principal Identity
    const userId = req.user?._id || req.body.mockUserId; 
    if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });

    // 4. Delegation downstream to Orchestration Service Layer
    const purchaseOrder = await poService.createPurchaseOrder(validatedData, userId);

    return res.status(201).json({
      success: true,
      message: 'Purchase order draft created successfully',
      data: purchaseOrder
    });
  } catch (err) {
    next(err); 
  }
};


export const handleGetPOs = async (req, res) => {
  try {
    const orders = await poService.getPurchaseOrders(req.query);
    return res.status(200).json({ success: true, data: orders });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const handleSubmitPO = async (req, res) => {
  try {
    const userId = req.user?._id || req.body.mockUserId;
    const updatedPO = await poService.submitPurchaseOrder(req.params.id, userId);
    return res.status(200).json({ success: true, data: updatedPO });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

export const handleApprovePO = async (req, res) => {
  try {
    const userId = req.user?._id || req.body.mockUserId;
    const updatedPO = await poService.approvePurchaseOrder(req.params.id, userId);
    return res.status(200).json({ success: true, data: updatedPO });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

export const handleSendPO = async (req, res) => {
  try {
    const updatedPO = await poService.sendPurchaseOrderToSupplier(req.params.id);
    return res.status(200).json({ success: true, data: updatedPO });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

export const handleCancelPO = async (req, res) => {
  try {
    const updatedPO = await poService.cancelPurchaseOrder(req.params.id);
    return res.status(200).json({ success: true, data: updatedPO });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};
