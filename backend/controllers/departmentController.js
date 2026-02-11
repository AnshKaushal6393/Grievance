import Department from "../models/Department.js";
import User from "../models/User.js";
import Complaint from "../models/Complaint.js";

export const getDepartments = async (req, res) => {
  try {
    const departments = await Department.find()
      .populate("headOfDepartment", "name email phone")
      .populate("officers", "name email phone");

    const deptWithStats = await Promise.all(
      departments.map(async (dept) => {
        const [total, pending, resolvedThisMonth] = await Promise.all([
          Complaint.countDocuments({ department: dept._id, isDraft: false }),
          Complaint.countDocuments({
            department: dept._id,
            status: { $in: ["filed", "assigned", "in-progress"] },
            isDraft: false,
          }),
          Complaint.countDocuments({
            department: dept._id,
            status: "resolved",
            resolvedDate: { $gte: new Date(new Date().setDate(1)) },
            isDraft: false,
          }),
        ]);

        return {
          ...dept.toObject(),
          stats: { total, pending, resolvedThisMonth },
        };
      }),
    );

    res.status(200).json({
      success: true,
      data: { departments: deptWithStats, count: deptWithStats.length },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDepartment = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id)
      .populate("headOfDepartment", "name email phone")
      .populate("officers", "name email phone role");

    if (!department)
      return res
        .status(404)
        .json({ success: false, message: "Department not found" });

    res.status(200).json({ success: true, data: { department } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createDepartment = async (req, res) => {
  try {
    const {
      name,
      code,
      description,
      categories,
      contactEmail,
      contactPhone,
      contactAddress,
      maxCapacity,
      slaTargets,
    } = req.body;

    if (!name || !code)
      return res
        .status(400)
        .json({ success: false, message: "Name and code are required" });

    const existing = await Department.findOne({ $or: [{ name }, { code }] });
    if (existing)
      return res.status(400).json({
        success: false,
        message: "Department with same name or code already exists",
      });

    const department = await Department.create({
      name,
      code: code.toUpperCase(),
      description,
      categories: categories || [],
      contactInfo: {
        email: contactEmail,
        phone: contactPhone,
        address: contactAddress,
      },
      slaTargets: slaTargets || { low: 168, medium: 72, high: 24, critical: 4 },
      maxCapacity: maxCapacity || 50,
    });

    res.status(201).json({
      success: true,
      message: "Department created successfully",
      data: { department },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateDepartment = async (req, res) => {
  try {
    const {
      name,
      code,
      description,
      categories,
      contactEmail,
      contactPhone,
      contactAddress,
      maxCapacity,
      slaTargets,
      isActive,
    } = req.body;

    const department = await Department.findById(req.params.id);
    if (!department)
      return res
        .status(404)
        .json({ success: false, message: "Department not found" });

    if (name) department.name = name;
    if (code) department.code = code.toUpperCase();
    if (description !== undefined) department.description = description;
    if (categories) department.categories = categories;
    if (contactEmail) department.contactInfo.email = contactEmail;
    if (contactPhone) department.contactInfo.phone = contactPhone;
    if (contactAddress) department.contactInfo.address = contactAddress;
    if (maxCapacity) department.maxCapacity = maxCapacity;
    if (slaTargets) department.slaTargets = slaTargets;
    if (isActive !== undefined) department.isActive = isActive;

    await department.save();

    res.status(200).json({
      success: true,
      message: "Department updated successfully",
      data: { department },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteDepartment = async(req,res)=>{
    try {
    const department = await Department.findById(req.params.id);
    if (!department) return res.status(404).json({ success: false, message: 'Department not found' });

    const activeComplaints = await Complaint.countDocuments({
      department: req.params.id,
      status: { $in: ['filed', 'assigned', 'in-progress'] }
    });

    if (activeComplaints > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete. ${activeComplaints} active complaints assigned to this department.`
      });
    }

    await department.deleteOne();
    res.status(200).json({ success: true, message: 'Department deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addOfficer = async (req,res)=>{
    try {
    const { userId, designation } = req.body;

    const department = await Department.findById(req.params.id);
    if (!department) return res.status(404).json({ success: false, message: 'Department not found' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (department.officers.includes(userId)) {
      return res.status(400).json({ success: false, message: 'Officer already in this department' });
    }

    department.officers.push(userId);
    await department.save();

    // Update user role to officer
    user.role = 'officer';
    if (designation) user.designation = designation;
    await user.save();

    await department.populate('officers', 'name email phone');

    res.status(200).json({
      success: true,
      message: 'Officer added successfully',
      data: { department }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export const removeOfficer = async (req,res)=>{
    try {
    const department = await Department.findById(req.params.id);
    if (!department) return res.status(404).json({ success: false, message: 'Department not found' });

    department.officers = department.officers.filter(
      id => id.toString() !== req.params.officerId
    );
    await department.save();

    res.status(200).json({ success: true, message: 'Officer removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

