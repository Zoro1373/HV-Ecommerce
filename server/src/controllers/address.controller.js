import * as addressService from "../services/address.service.js";

export async function listAddresses(req, res, next) {
  try {
    const addresses = await addressService.listAddresses(req.user.id);
    res.json({ success: true, addresses });
  } catch (err) {
    next(err);
  }
}

export async function getAddress(req, res, next) {
  try {
    const address = await addressService.getAddressById(req.user.id, req.params.id);
    res.json({ success: true, address });
  } catch (err) {
    next(err);
  }
}

export async function createAddress(req, res, next) {
  try {
    const address = await addressService.createAddress(req.user.id, req.body);
    res.status(201).json({ success: true, address });
  } catch (err) {
    next(err);
  }
}

export async function updateAddress(req, res, next) {
  try {
    const address = await addressService.updateAddress(req.user.id, req.params.id, req.body);
    res.json({ success: true, address });
  } catch (err) {
    next(err);
  }
}

export async function deleteAddress(req, res, next) {
  try {
    const result = await addressService.deleteAddress(req.user.id, req.params.id);
    res.json({ success: true, message: "Address deleted successfully." });
  } catch (err) {
    next(err);
  }
}
