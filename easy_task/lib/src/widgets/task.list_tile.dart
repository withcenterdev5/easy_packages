import 'dart:async';
import 'package:easy_task/easy_task.dart';
import 'package:flutter/material.dart';

class TaskListTile extends StatefulWidget {
  const TaskListTile({
    super.key,
    required this.task,
  });

  final Task task;

  @override
  State<TaskListTile> createState() => _TaskListTileState();
}

class _TaskListTileState extends State<TaskListTile> {
  /// [checked] is used to show the checkbox value before the task is disappeared
  /// This is used only for the root level tasks.
  bool checked = false;

  @override
  void initState() {
    super.initState();
    checked = widget.task.completed;
  }

  @override
  Widget build(BuildContext context) {
    /// If the task is root level task, show the changes of checkbox selection
    /// before disappearing the task
    bool checkboxValue;
    if (widget.task.parent == null) {
      checkboxValue = checked;
    } else {
      /// If the task is a child, then simply use the task's completed value,
      /// because the task will not be disappeared.
      checkboxValue = widget.task.completed;
    }
    return InkWell(
      child: Padding(
        padding: const EdgeInsets.all(8.0),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            widget.task.project
                ? const SizedBox(
                    width: 48, height: 48, child: Icon(Icons.diversity_1))
                : Checkbox(
                    value: checkboxValue,
                    onChanged: (bool? value) {
                      if (value != null) {
                        if (widget.task.parent != null) {
                          widget.task.toggleCompleted(value);
                          return;
                        }

                        setState(() {
                          checked = value;
                        });

                        /// Delay the task completion to show the animation
                        /// Purpose: to let the user know why the task is not being disappeared immediately
                        /// Without this delay, the task will be disappeared immediately and use may be confused
                        Timer(const Duration(milliseconds: 460), () async {
                          await widget.task.toggleCompleted(value);
                        });
                      }
                    },
                  ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    widget.task.title,
                    style: Theme.of(context).textTheme.titleLarge,
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    widget.task.description,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            if (widget.task.urls.isNotEmpty) const Icon(Icons.photo_outlined),
            const Icon(Icons.chevron_right),
            const SizedBox(width: 8),
          ],
        ),
      ),
      onTap: () {
        if (widget.task.project) {
          TaskService.instance.showProjectDetailScreen(context, widget.task);
        } else {
          TaskService.instance.showTaskDetailScreen(context, widget.task);
        }
      },
    );
  }
}
