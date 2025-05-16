import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";

interface CustomDatePickerProps {
  isVisible: boolean;
  onClose: () => void;
  onDateChange: (date: Date) => void;
  initialDate: Date;
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  isVisible,
  onClose,
  onDateChange,
  initialDate,
}) => {
  const [selectedDate, setSelectedDate] = useState(initialDate);

  const handleConfirm = () => {
    onDateChange(selectedDate);
    onClose();
  };

  return (
    <Modal visible={isVisible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.headerButton}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleConfirm}>
              <Text style={styles.headerButton}>Confirm</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.pickerContainer}>
            <ScrollPicker
              items={Array.from({ length: 31 }, (_, i) =>
                String(i + 1).padStart(2, "0")
              )}
              selectedIndex={selectedDate.getDate() - 1}
              onValueChange={(value) => {
                const newDate = new Date(selectedDate);
                newDate.setDate(parseInt(value));
                setSelectedDate(newDate);
              }}
            />
            <ScrollPicker
              items={[
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
              ]}
              selectedIndex={selectedDate.getMonth()}
              onValueChange={(value) => {
                const newDate = new Date(selectedDate);
                newDate.setMonth(
                  [
                    "Jan",
                    "Feb",
                    "Mar",
                    "Apr",
                    "May",
                    "Jun",
                    "Jul",
                    "Aug",
                    "Sep",
                    "Oct",
                    "Nov",
                    "Dec",
                  ].indexOf(value)
                );
                setSelectedDate(newDate);
              }}
            />
            <ScrollPicker
              items={Array.from({ length: 10 }, (_, i) =>
                String(new Date().getFullYear() + i)
              )}
              selectedIndex={
                selectedDate.getFullYear() - new Date().getFullYear()
              }
              onValueChange={(value) => {
                const newDate = new Date(selectedDate);
                newDate.setFullYear(parseInt(value));
                setSelectedDate(newDate);
              }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

interface ScrollPickerProps {
  items: string[];
  selectedIndex: number;
  onValueChange: (value: string) => void;
}

const ScrollPicker: React.FC<ScrollPickerProps> = ({
  items,
  selectedIndex,
  onValueChange,
}) => {
  return (
    <ScrollView
      style={styles.scrollPicker}
      showsVerticalScrollIndicator={false}
    >
      {items.map((item, index) => (
        <TouchableOpacity
          key={item}
          onPress={() => onValueChange(item)}
          style={[
            styles.scrollPickerItem,
            index === selectedIndex && styles.scrollPickerItemSelected,
          ]}
        >
          <Text
            style={[
              styles.scrollPickerItemText,
              index === selectedIndex && styles.scrollPickerItemTextSelected,
            ]}
          >
            {item}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0)",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerButton: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  pickerContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  scrollPicker: {
    height: 200,
    width: 80,
  },
  scrollPickerItem: {
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollPickerItemSelected: {
    backgroundColor: "#F0F0F0",
  },
  scrollPickerItemText: {
    fontSize: 16,
  },
  scrollPickerItemTextSelected: {
    fontWeight: "bold",
  },
});

export default CustomDatePicker;
