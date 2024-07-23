import 'package:easy_comment/easy_comment.dart';
import 'package:easy_helpers/easy_helpers.dart';
import 'package:easyuser/easyuser.dart';
import 'package:flutter/material.dart';

class CommentDetail extends StatelessWidget {
  const CommentDetail({
    super.key,
    required this.comment,
    this.displayAvatar = true,
  });

  final Comment comment;
  final bool displayAvatar;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          children: [
            if (displayAvatar) ...[
              UserAvatar.fromUid(
                uid: comment.uid,
                size: 42,
                radius: 18,
              ),
              const SizedBox(width: 8),
            ],
            Text(comment.createdAt.toShort),
          ],
        ),
        Text(comment.content),
        Row(
          children: [
            TextButton(
              onPressed: () => CommentService.instance.showCommentEditDialog(
                context: context,
                parent: comment,
                focusOnContent: true,
              ),
              child: const Text('Reply'),
            ),
            const Spacer(),
            PopupMenuButton<String>(
              itemBuilder: (_) => [
                const PopupMenuItem(
                  value: 'edit',
                  child: Text('Edit'),
                ),
                const PopupMenuItem(
                  value: 'delete',
                  child: Text('Delete'),
                ),
              ],
              child: const Icon(Icons.more_vert),
              onSelected: (value) {},
            ),
          ],
        ),
      ],
    );
  }
}
